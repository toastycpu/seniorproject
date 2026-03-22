import {
    View, Text, Image, TextInput, StyleSheet, Pressable, ScrollView, Alert, 
    ActivityIndicator, KeyboardAvoidingView, Platform, FlatList, Dimensions,
} from 'react-native';
import { useState, useEffect } from 'react';
import { useRouter } from 'expo-router';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db, auth, storage } from '../firebase/firebaseConfig';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import DateTimePicker from '@react-native-community/datetimepicker';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { Region } from 'react-native-maps';
import * as Location from 'expo-location';
import { GooglePlacesAutocomplete } from 'react-native-google-places-autocomplete';

export default function CreateScreen() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);

    const [images, setImages] = useState<string[]>([]);
    const [title, setTitle] = useState('');
    const [address, setAddress] = useState('');
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
    
    const removeImage = (indexToRemove: number) => {
        setImages(currentImages => currentImages.filter((_, index) => index !== indexToRemove));
    };

    const [location, setLocation] = useState<Region>({
        latitude: 37.1305,
        longitude: -113.6644,
        latitudeDelta: 0.0922,
        longitudeDelta: 0.0421,
    });

    useEffect(() => {
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
                    setAddress(`${streetInfo}, ${cityState}`);
                }
            }
        })();
    }, []);

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

    const handleCreatePost = async () => {
        if (!title || !address || !description || !startTime || !endTime || images.length === 0) {
            Alert.alert('Missing Info', 'Please fill out all fields');
            return;
        }
        setLoading(true);

        try {
            const uploadedUrls = await Promise.all(
                images.map((uri) => uploadImageAsync(uri))
            );

            const expireDate = new Date();
            expireDate.setDate(expireDate.getDate() + longevity);

            await addDoc(collection(db, 'sales'), {
                title,
                address,
                description,
                startTime,
                endTime,
                longevityDays: longevity,
                expiresAt: expireDate,
                categories: ['Furniture'],
                images: uploadedUrls,
                likes: 0,
                postedBy: auth.currentUser?.uid,
                authorName: auth.currentUser?.displayName || auth.currentUser?.email || 'Anonymous',
                authorAvatar: auth.currentUser?.photoURL || null,
                postedDate: new Date().toISOString().split('T')[0],
                createdAt: serverTimestamp(),
                latitude: location.latitude,
                longitude: location.longitude,
            });

            setLoading(false);
            Alert.alert('Success', 'Your sale was posted!');
            router.back();
        } catch (error) {
            setLoading(false);
            Alert.alert('Error', 'Could not create post');
        }
    };

    return (
        <View style={createstyles.container}>
            <View style={createstyles.header}>
                <Pressable onPress={() => router.back()}>
                    <Ionicons name="close" size={28} color="black" />
                </Pressable>
                <Text style={createstyles.headerTitle}>New Sale</Text>
                <View style={{ width: 28 }} />
            </View>
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={{ flex: 1 }}
            >
                <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingBottom: 50 }}>
                    <View style={createstyles.imagepicker}>
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
                                            <Image
                                                source={{ uri: item }}
                                                style={{ width: '100%', height: '100%', resizeMode: 'cover' }}
                                            />
                                            <Pressable
                                                style={createstyles.deleteImageButton}
                                                onPress={() => removeImage(index)}
                                            >
                                                <Ionicons name="trash-outline" size={20} color="white" />
                                            </Pressable>
                                        </View>
                                    )}
                                />
                                <Pressable onPress={pickImages} style={createstyles.editPhotoButton}>
                                    <Ionicons name="camera" size={20} color="white" />
                                    <Text style={createstyles.editPhotoText}>Edit</Text>
                                </Pressable>
                            </View>
                        ) : (
                            <Pressable onPress={pickImages} style={createstyles.placeholderContainer}>
                                <Ionicons name="camera-outline" size={40} color="#1A3C40" />
                                <Text style={createstyles.placeholderText}>Add photos</Text>
                            </Pressable>
                        )}
                    </View>

                    <Text style={createstyles.label}>Title</Text>
                    <TextInput
                        style={createstyles.input}
                        placeholder="e.g. Mega sale"
                        value={title} onChangeText={setTitle}
                    />
                    
                    <Text style={createstyles.label}>Address</Text>
                    <View style={{ zIndex: 1 }}>
                        <GooglePlacesAutocomplete
                            placeholder="e.g. 123 sunset blv."
                            fetchDetails={true}
                            disableScroll={true}
                            onPress={(data, details = null) => {

                                setAddress(data.description);
                                

                                if (details?.geometry?.location) {
                                    setLocation({
                                        latitude: details.geometry.location.lat,
                                        longitude: details.geometry.location.lng,
                                        latitudeDelta: 0.01,
                                        longitudeDelta: 0.01,
                                    });
                                }
                            }}
                            query={{
                                key: 'AIzaSyAO7V8REcbNEmifnuI2DaRpHzlpHQKC3lk',
                                language: 'en',
                                components: 'country:us',
                            }}
                            styles={{
                                textInputContainer: {
                                    width: '100%',
                                },
                                textInput: {
                                    borderWidth: 1,
                                    borderColor: '#ddd',
                                    padding: 14,
                                    borderRadius: 12,
                                    backgroundColor: '#f9f9f9',
                                    fontSize: 16,
                                    height: 50,
                                },
                                listView: {
                                    backgroundColor: 'white',
                                    borderRadius: 12,
                                    marginTop: 5,
                                    elevation: 3,
                                    shadowColor: '#000',
                                    shadowOffset: { width: 0, height: 2 },
                                    shadowOpacity: 0.1,
                                    shadowRadius: 4,
                                },
                            }}
                        />
                    </View>
                    
                    <Text style={createstyles.label}>Description</Text>
                    <TextInput
                        style={[createstyles.input, createstyles.textArea]}
                        placeholder="What are you selling?"
                        value={description} onChangeText={setDescription}
                        multiline
                    />

                    <Text style={createstyles.label}>Post Longevity (Days)</Text>
                    <View style={createstyles.longevityContainer}>
                        {longevityOptions.map((option) => (
                            <Pressable
                                key={option}
                                onPress={() => setLongevity(option)}
                                style={[
                                    createstyles.longevityInput,
                                    longevity === option && createstyles.longevityInputActive
                                ]}
                            >
                                <Text style={[
                                    createstyles.longevityText,
                                    longevity === option && createstyles.longevityTextActive
                                ]}>
                                    {option} {option === 1 ? 'Day' : 'Days'}
                                </Text>
                            </Pressable>
                        ))}
                    </View>

                    <View style={createstyles.row}>
                        <View style={{ flex: 1, marginRight: 10 }}>
                            <Text style={createstyles.label}>Start Time</Text>
                            <Pressable style={createstyles.input} onPress={() => setShowStartPicker(true)}>
                                <Text style={{ color: startTime ? '#000' : '#999' }}>
                                    {startTime || "Select Time"}
                                </Text>
                            </Pressable>
                        </View>
                        <View style={{ flex: 1 }}>
                            <Text style={createstyles.label}>End Time</Text>
                            <Pressable style={createstyles.input} onPress={() => setShowEndPicker(true)}>
                                <Text style={{ color: endTime ? '#000' : '#999' }}>
                                    {endTime || "Select Time"}
                                </Text>
                            </Pressable>
                        </View>
                    </View>

                    {showStartPicker && (
                        <DateTimePicker
                            value={tempDate}
                            mode="time"
                            display="default"
                            onChange={(event, selectedDate) => {
                                setShowStartPicker(false);
                                if (selectedDate) {
                                    setStartTime(formatTime(selectedDate));
                                }
                            }}
                        />
                    )}
                    
                    {showEndPicker && (
                        <DateTimePicker
                            value={tempDate}
                            mode="time"
                            display="default"
                            onChange={(event, selectedDate) => {
                                setShowEndPicker(false);
                                if (selectedDate) {
                                    setEndTime(formatTime(selectedDate));
                                }
                            }}
                        />
                    )}

                    <Pressable style={createstyles.postButton} onPress={handleCreatePost} disabled={loading}>
                        {loading ? (
                            <ActivityIndicator color="white" />
                        ) : (
                            <Text style={createstyles.postButtonText}>Post Sale</Text>
                        )}
                    </Pressable>
                </ScrollView>
            </KeyboardAvoidingView>
        </View>
    );
}

const createstyles = StyleSheet.create({
    container: {flex: 1, backgroundColor: 'white', padding: 20, paddingTop: 50},
    header: {
        flexDirection: 'row', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        marginBottom: 20 },
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
        borderStyle: 'dashed'
    },
    placeholderContainer: {
        flex: 1, justifyContent: 'center', alignItems: 'center'},
    editPhotoButton: {
        position: 'absolute', bottom: 10, right: 10, backgroundColor: 'rgba(0,0,0,0.7)',
        flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20,
    },
    editPhotoText: { color: 'white', fontWeight: 'bold', marginLeft: 6 },
    deleteImageButton: {
        position: 'absolute',
        top: 10,
        right: 10,
        backgroundColor: '#f508088a',
        padding: 8,
        borderRadius: 20,
    },


    placeholder: { alignItems: 'center' },
    placeholderText: { color: '#1A3C40', fontWeight: '600', marginTop: 8 },
    label: { 
        fontWeight: '600', 
        marginTop: 15, 
        marginBottom: 5, 
        color: '#333' },
    input: { 
        borderWidth: 1, 
        borderColor: '#ddd', 
        padding: 14, 
        borderRadius: 12, 
        backgroundColor: '#f9f9f9', 
        fontSize: 16 },

    textArea: { height: 100, textAlignVertical: 'top' },
    row: {flexDirection: 'row'},

    
    longevityContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 5,
    },
    longevityInput: {
        flex: 1,
        paddingVertical: 10,
        marginHorizontal: 4,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: '#ddd',
        backgroundColor: '#f9f9f9',
        alignItems: 'center',
    },
    longevityInputActive: {
        backgroundColor: '#1A3C40',
        borderColor: '#1A3C40',
    },
    longevityText: {
        color: '#666',
        fontWeight: '500',
    },
    longevityTextActive: {
        color: 'white',
        fontWeight: 'bold',
    },   

    postButton: { 
        backgroundColor: '#1A3C40', 
        padding: 16, 
        borderRadius: 12, 
        marginTop: 30, 
        alignItems: 'center' },
    postButtonText: {color: 'white', fontWeight: 'bold', fontSize: 16 },
});