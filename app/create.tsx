import {
    View, Text, Image, TextInput, StyleSheet, Pressable, ScrollView, Alert, 
    ActivityIndicator, KeyboardAvoidingView, Platform, FlatList, Dimensions,
} from 'react-native';
import { useState, useEffect, useRef } from 'react';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { collection, addDoc, doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db, auth, storage } from '../firebase/firebaseConfig';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import DateTimePicker from '@react-native-community/datetimepicker';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { Region } from 'react-native-maps';
import * as Location from 'expo-location';
import { GooglePlacesAutocomplete, GooglePlacesAutocompleteRef } from 'react-native-google-places-autocomplete';

export default function FormScreen() {
    const router = useRouter();
    const { id } = useLocalSearchParams<{ id: string }>();
    const isEditMode = Boolean(id && id !== 'undefined' && id !== 'null');

    const [loading, setLoading] = useState(isEditMode);
    const [saving, setSaving] = useState(false);

    const [images, setImages] = useState<string[]>([]);
    const [title, setTitle] = useState('');
    const [address, setAddress] = useState('');
    const [isAddressValid, setIsAddressValid] = useState(false);
    const [description, setDescription] = useState('');

    const [startTime, setStartTime] = useState('');
    const [endTime, setEndTime] = useState('');
    const [showStartPicker, setShowStartPicker] = useState(false);
    const [showEndPicker, setShowEndPicker] = useState(false);
    const [tempDate] = useState(new Date());

    const [longevity, setLongevity] = useState(3);
    const longevityOptions = [1, 2, 3, 5, 7];

    const { width: screenWidth } = Dimensions.get('window');
    const imageWidth = screenWidth - 40;
    const googlePlacesRef = useRef<GooglePlacesAutocompleteRef>(null);

    const [location, setLocation] = useState<Region>({
        latitude: 37.1305,
        longitude: -113.6644,
        latitudeDelta: 0.0922,
        longitudeDelta: 0.0421,
    });

    useEffect(() => {
        if (!isEditMode) return;

        const fetchPostData = async () => {
            try {
                const docRef = doc(db, 'sales', id);
                const docSnap = await getDoc(docRef);

                if (docSnap.exists()) {
                    const data = docSnap.data();
                    setTitle(data.title || '');
                    setAddress(data.address || '');
                    setIsAddressValid(true);
                    setDescription(data.description || '');
                    setStartTime(data.startTime || '');
                    setEndTime(data.endTime || '');
                    setLongevity(data.longevityDays || data.duration || 3); 
                    setImages(data.images || []);
                    
                    if (data.latitude && data.longitude) {
                        setLocation({
                            latitude: data.latitude,
                            longitude: data.longitude,
                            latitudeDelta: 0.01,
                            longitudeDelta: 0.01,
                        });
                    }

                    if (data.address && googlePlacesRef.current) {
                        googlePlacesRef.current.setAddressText(data.address);
                    }
                } else {
                    Alert.alert('Error', 'Post not found!');
                    router.back();
                }
            } catch (error) {
                console.log('Error fetching post:', error);
                Alert.alert('Error', 'Could not load post data.');
            } finally {
                setLoading(false);
            }
        };

        fetchPostData();
    }, [id, isEditMode]);

    useEffect(() => {
        if (isEditMode) return; 

        (async () => {
            let { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== 'granted') {
                Alert.alert('Permission Denied', 'We need location access to accurately place your sale.');
                return;
            }
            let currentLocation = await Location.getCurrentPositionAsync({});
            const { latitude, longitude } = currentLocation.coords;

            setLocation({
                latitude,
                longitude,
                latitudeDelta: 0.01,
                longitudeDelta: 0.01,
            });

            let geocode = await Location.reverseGeocodeAsync({ latitude, longitude });
            if (geocode.length > 0) {
                const place = geocode[0];
                const streetInfo = `${place.streetNumber || ''} ${place.street || ''}`.trim();
                const cityState = `${place.city || ''}, ${place.region || ''}`.trim();

                if (streetInfo && cityState) {
                    const fullAddress = `${streetInfo}, ${cityState}`;
                    setAddress(fullAddress);
                    setIsAddressValid(true);
                    if (googlePlacesRef.current) {
                        googlePlacesRef.current.setAddressText(fullAddress);
                    }
                }
            }
        })();
    }, [isEditMode]);

    const removeImage = (indexToRemove: number) => {
        setImages(currentImages => currentImages.filter((_, index) => index !== indexToRemove));
    };

    const handleAddPhoto = () => {
        Alert.alert(
            "Add a Photo",
            "Choose where to get your picture from",
            [
                { text: "Take Photo", onPress: takePhoto },
                { text: "Choose from Gallery", onPress: pickImages },
                { text: "Cancel", style: "cancel" }
            ]
        );
    };

    const takePhoto = async () => {
        const permissionResult = await ImagePicker.requestCameraPermissionsAsync();
        
        if (permissionResult.granted === false) {
            Alert.alert("Permission Denied", "We need camera access to take pictures of your items.");
            return;
        }

        let result = await ImagePicker.launchCameraAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            quality: 0.2, 
        });

        if (!result.canceled) {
            const selectedUris = result.assets.map(asset => asset.uri);
            setImages(prevImages => [...prevImages, ...selectedUris]);
        }
    };

    const pickImages = async () => {
        let result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsMultipleSelection: true,
            quality: 0.2,
        });

        if (!result.canceled) {
            const selectedUris = result.assets.map(asset => asset.uri);
            setImages(prevImages => [...prevImages, ...selectedUris]);
        }
    };

    const formatTime = (date: Date) => {
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    const uploadImageAsync = async (uri: string) => {
        const response = await fetch(uri);
        const blob = await response.blob();
        const fileRef = ref(storage, `sales/${Date.now()}-${Math.random().toString(36)}`);
        await uploadBytes(fileRef, blob);
        return await getDownloadURL(fileRef);
    };

    const handleSavePost = async () => {
        if (!title || !address || !description || !startTime || !endTime || images.length === 0) {
            Alert.alert('Missing Info', 'Please fill out all fields');
            return;
        }
        if (!isAddressValid) {
            Alert.alert('Invalid Address', 'Please select a valid location from the dropdown suggestions.');
            return;
        }

        if (startTime === endTime) {
            Alert.alert('Invalid Time', 'Start and end time cannot be exactly the same.');
            return;
        }
        setSaving(true);

        try {
            const existingUrls = images.filter(img => img.startsWith('http'));
            const newUris = images.filter(img => !img.startsWith('http'));
            const uploadedUrls = await Promise.all(
                newUris.map((uri) => uploadImageAsync(uri))
            );
            const finalImages = [...existingUrls, ...uploadedUrls];

            const expireDate = new Date();
            expireDate.setDate(expireDate.getDate() + longevity);

            const postData = {
                title,
                address,
                description,
                startTime,
                endTime,
                longevityDays: longevity,
                expiresAt: expireDate,
                images: finalImages,
                latitude: location.latitude,
                longitude: location.longitude,
            };

            if (isEditMode) {
                const docRef = doc(db, 'sales', id);
                await updateDoc(docRef, postData);
                Alert.alert('Success', 'Your post was updated!');
            } else {
                await addDoc(collection(db, 'sales'), {
                    ...postData,
                    categories: ['Furniture'],
                    likes: 0,
                    postedBy: auth.currentUser?.uid || 'Anonymous',
                    authorName: auth.currentUser?.displayName || auth.currentUser?.email || 'Anonymous',
                    authorAvatar: auth.currentUser?.photoURL || null,
                    postedDate: new Date().toISOString().split('T')[0],
                    createdAt: serverTimestamp(),
                });
                Alert.alert('Success', 'Your sale was posted!');
            }

            setSaving(false);
            router.back();
        } catch (error) {
            setSaving(false);
            console.log("Error saving:", error);
            Alert.alert('Error', 'Could not save post');
        }
    };

    if (loading) {
        return (
            <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
                <ActivityIndicator size="large" color="#1A3C40" />
                <Text style={{ marginTop: 10, color: '#1A3C40' }}>Loading details...</Text>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Pressable onPress={() => router.back()} style={{ padding: 5 }}>
                    <Ionicons name="close" size={28} color="black" />
                </Pressable>
                <Text style={styles.headerTitle}>{isEditMode ? "Edit Sale" : "New Sale"}</Text>
                <View style={{ width: 38 }} />
            </View>

            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
                <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingBottom: 50 }}>
                    
                    <View style={styles.imagepicker}>
                        {images.length > 0 ? (
                            <View style={{ width: '100%', height: '100%' }}>
                                <FlatList
                                    data={images}
                                    horizontal
                                    pagingEnabled
                                    showsHorizontalScrollIndicator={false}
                                    keyExtractor={(item, index) => index.toString()}
                                    renderItem={({ item, index }) => (
                                        <View style={{ width: imageWidth, height: '100%' }}>
                                            <Image source={{ uri: item }} style={{ width: '100%', height: '100%', resizeMode: 'cover' }} />
                                            <Pressable style={styles.deleteImageButton} onPress={() => removeImage(index)}>
                                                <Ionicons name="trash-outline" size={20} color="white" />
                                            </Pressable>
                                        </View>
                                    )}
                                />
                                <Pressable onPress={handleAddPhoto} style={styles.editPhotoButton}>
                                    <Ionicons name="camera" size={20} color="white" />
                                    <Text style={styles.editPhotoText}>Edit</Text>
                                </Pressable>
                            </View>
                        ) : (
                            
                            <Pressable onPress={handleAddPhoto} style={styles.placeholderContainer}>
                                <Ionicons name="camera-outline" size={40} color="#1A3C40" />
                                <Text style={styles.placeholderText}>Add photos</Text>
                            </Pressable>
                        )}
                    </View>

                    <Text style={styles.label}>Title</Text>
                    <TextInput style={styles.input} placeholder="e.g. Mega sale" value={title} onChangeText={setTitle} />
                    
                    <Text style={styles.label}>Address</Text>
                    <View style={{ zIndex: 1 }}>
                        <GooglePlacesAutocomplete
                            ref={googlePlacesRef}
                            placeholder="e.g. 123 sunset blv."
                            fetchDetails={true}
                            disableScroll={true}
                            textInputProps={{ 
                                onChangeText: (text) => {
                                setAddress(text);
                                setIsAddressValid(false);
                            },
                                value: address
                            }}
                            onPress={(data, details = null) => {
                                setAddress(data.description);
                                setIsAddressValid(true);
                                if (details?.geometry?.location) {
                                    setLocation({
                                        latitude: details.geometry.location.lat,
                                        longitude: details.geometry.location.lng,
                                        latitudeDelta: 0.01,
                                        longitudeDelta: 0.01,
                                    });
                                }
                            }}
                            query={{ key: process.env.EXPO_PUBLIC_GOOGLE_MAPS_KEY, language: 'en', components: 'country:us' }}
                            styles={{
                                textInputContainer: { width: '100%' },
                                textInput: { borderWidth: 1, borderColor: '#ddd', padding: 14, borderRadius: 12, backgroundColor: '#f9f9f9', fontSize: 16, height: 50 },
                                listView: { backgroundColor: 'white', borderRadius: 12, marginTop: 5, elevation: 3, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4 },
                            }}
                        />
                    </View>
                    
                    <Text style={styles.label}>Description</Text>
                    <View>
                        <TextInput 
                            style={[styles.input, styles.textArea]} 
                            placeholder="What are you selling?" 
                            value={description} 
                            onChangeText={setDescription} 
                            multiline 
                            maxLength={500}
                        />
                        <Text style={styles.charCount}>
                            {description.length}/500
                        </Text>
                    </View>

                    <Text style={styles.label}>Post Longevity (Days)</Text>
                    <View style={styles.longevityContainer}>
                        {longevityOptions.map((option) => (
                            <Pressable key={option} onPress={() => setLongevity(option)} style={[styles.longevityInput, longevity === option && styles.longevityInputActive]}>
                                <Text style={[styles.longevityText, longevity === option && styles.longevityTextActive]}>
                                    {option} {option === 1 ? 'Day' : 'Days'}
                                </Text>
                            </Pressable>
                        ))}
                    </View>

                    <View style={styles.row}>
                        <View style={{ flex: 1, marginRight: 10 }}>
                            <Text style={styles.label}>Start Time</Text>
                            <Pressable style={styles.input} onPress={() => setShowStartPicker(true)}>
                                <Text style={{ color: startTime ? '#000' : '#999' }}>{startTime || "Select Time"}</Text>
                            </Pressable>
                        </View>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.label}>End Time</Text>
                            <Pressable style={styles.input} onPress={() => setShowEndPicker(true)}>
                                <Text style={{ color: endTime ? '#000' : '#999' }}>{endTime || "Select Time"}</Text>
                            </Pressable>
                        </View>
                    </View>

                    {showStartPicker && (
                        <DateTimePicker value={tempDate} mode="time" display="default" onChange={(e, date) => { setShowStartPicker(false); if (date) setStartTime(formatTime(date)); }} />
                    )}
                    
                    {showEndPicker && (
                        <DateTimePicker value={tempDate} mode="time" display="default" onChange={(e, date) => { setShowEndPicker(false); if (date) setEndTime(formatTime(date)); }} />
                    )}

                    <Pressable style={styles.postButton} onPress={handleSavePost} disabled={saving}>
                        {saving ? (
                            <ActivityIndicator color="white" />
                        ) : (
                            <Text style={styles.postButtonText}>{isEditMode ? "Save Changes" : "Post Sale"}</Text>
                        )}
                    </Pressable>
                </ScrollView>
            </KeyboardAvoidingView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {flex: 1, backgroundColor: 'white', padding: 20, paddingTop: 50},
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
    headerTitle: { fontSize: 20, fontWeight: 'bold'},

    imagepicker:{
        width: '100%', 
        height: 200, 
        backgroundColor: '#f0f0f0', 
        borderRadius: 12, 
        marginBottom: 10, 
        overflow: 'hidden', 
        justifyContent: 'center', 
        alignItems: 'center', 
        borderWidth: 1, 
        borderColor: '#ddd', 
        borderStyle: 'dashed' },
    placeholderContainer: { flex: 1, justifyContent: 'center', alignItems: 'center'},
    editPhotoButton: { 
        position: 'absolute', 
        bottom: 10, right: 10, 
        backgroundColor: 'rgba(0,0,0,0.7)', 
        flexDirection: 'row', 
        alignItems: 'center', 
        paddingHorizontal: 16, 
        paddingVertical: 8, 
        borderRadius: 20 },
    editPhotoText: { color: 'white', fontWeight: 'bold', marginLeft: 6 },
    deleteImageButton: { position: 'absolute', top: 10, right: 10, backgroundColor: '#f508088a', padding: 8, borderRadius: 20 },

    placeholderText: { color: '#1A3C40', fontWeight: '600', marginTop: 8 },
    label: { fontWeight: '600', marginTop: 15, marginBottom: 5, color: '#333' },
    input: { borderWidth: 1, borderColor: '#ddd', padding: 14, borderRadius: 12, backgroundColor: '#f9f9f9', fontSize: 16 },
    textArea: { height: 100, textAlignVertical: 'top' },
    charCount: { textAlign: 'right', fontSize: 12, color: '#888', marginTop: 4, marginRight: 4 },
    row: {flexDirection: 'row'},

    longevityContainer: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 5 },
    longevityInput: {
        flex: 1, 
        paddingVertical: 10, 
        marginHorizontal: 4, 
        borderRadius: 10, 
        borderWidth: 1, 
        borderColor: '#ddd', 
        backgroundColor: '#f9f9f9', 
        alignItems: 'center' },
    longevityInputActive: { backgroundColor: '#1A3C40', borderColor: '#1A3C40' },
    longevityText: { color: '#666', fontWeight: '500' },
    longevityTextActive: { color: 'white', fontWeight: 'bold' }, 

    postButton: { backgroundColor: '#1A3C40', padding: 16, borderRadius: 12, marginTop: 30, alignItems: 'center' },
    postButtonText: {color: 'white', fontWeight: 'bold', fontSize: 16 },
});