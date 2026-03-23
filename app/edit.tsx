import { View, Text, TextInput, Pressable, StyleSheet, ScrollView, Platform,
     Alert, ActivityIndicator, Image, FlatList, Dimensions, KeyboardAvoidingView} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useState, useEffect } from 'react';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase/firebaseConfig';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '../firebase/firebaseConfig';


export default function EditScreen() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const router = useRouter();

    const [title, setTitle] = useState('');
    const [address, setAddress] = useState('');
    const [description, setDescription] = useState('');
    const [startTime, setStartTime] = useState('');
    const [endTime, setEndTime] = useState('');
    const [duration, setDuration] = useState(24)
    const [images, setImages] = useState<string[]>([]);
    const { width: screenWidth } = Dimensions.get('window');
    const imageWidth = screenWidth - 40;
    
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        const fetchPostData = async () => {
            if (!id) {
                setLoading(false);
                Alert.alert('Error', 'Missing post Id');
                return;
            };
            
            try {
                const docRef = doc(db, 'sales', id);
                const docSnap = await getDoc(docRef);

                if (docSnap.exists()) {
                    const data = docSnap.data();
                    setTitle(data.title || '');
                    setAddress(data.address || '');
                    setDescription(data.description || '');
                    setStartTime(data.startTime || '');
                    setEndTime(data.endTime || '');
                    setDuration(duration ||24);
                    setImages(data.images || []);
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
    }, [id]);


    const removeImage = (indexToRemove: number) => {
        setImages(currentImages => currentImages.filter((_, index) => index !== indexToRemove));
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
    const uploadImageAsync = async (uri: string) => {
            const response = await fetch(uri);
            const blob = await response.blob();
            const fileRef = ref(storage, `sales/${Date.now()}-${Math.random().toString(36)}`);
            await uploadBytes(fileRef, blob);
            return await getDownloadURL(fileRef);
        };


    const handleUpdatePost = async () => {
        if (!title || !address || !description || !startTime || !endTime || !duration || images.length === 0) {
            Alert.alert('Missing Info', 'Please fill out all fields.');
            return;
        }
        setSaving(true);
        console.log("Updating document in database...");

        try {
            const existingUrls = images.filter(img => img.startsWith('http'));
            const newUris = images.filter(img => !img.startsWith('http'));
            const uploadedUrls = await Promise.all(
                newUris.map((uri) => uploadImageAsync(uri))
            );
            const finalImages = [...existingUrls, ...uploadedUrls];

            const newExpiresAt = new Date();
            newExpiresAt.setDate(newExpiresAt.getDate() + duration);
            const docRef = doc(db, 'sales', id);

            await updateDoc(docRef, {
                title,
                address,
                description,
                startTime,
                endTime,
                duration,
                expiresAt: newExpiresAt,
                images: finalImages,
            });
            
            console.log("Update finished!");
            Alert.alert('Success', 'Your post was updated!');
            router.back();
            
        } catch (error) {
            console.log("Error updating:", error);
            Alert.alert('Error', 'Could not update post.');
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <View style={[editstyles.container, { justifyContent: 'center', alignItems: 'center' }]}>
                <ActivityIndicator size="large" color="#1A3C40" />
                <Text style={{ marginTop: 10, color: '#1A3C40' }}>Loading post details...</Text>
            </View>
        );
    }

    return (
        <KeyboardAvoidingView 
            style={{ flex: 1 }} 
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
        >
        <ScrollView style={editstyles.container} contentContainerStyle={{ paddingBottom: 40 }}>
            <View style={editstyles.header}>
                <Pressable onPress={() => router.back()} style={editstyles.backButton}>
                    <Ionicons name="arrow-back" size={24} color="#1A3C40" />
                </Pressable>
                <Text style={editstyles.headerTitle}>Edit Post</Text>
                <View style={{ width: 40 }} />
            </View>


            <View style={editstyles.imagepicker}>
                    {images.length > 0 ? (
                        <View style={{ width: '100%', height: 250 }}>
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
                                            style={editstyles.deleteImageButton}
                                            onPress={() => removeImage(index)}
                                        >
                                            <Ionicons name="trash-outline" size={20} color="white" />
                                        </Pressable>
                                    </View>
                                )}
                            />
                            <Pressable onPress={pickImages} style={editstyles.editPhotoButton}>
                                <Ionicons name="camera" size={20} color="white" />
                                <Text style={editstyles.editPhotoText}>Add More</Text>
                            </Pressable>
                        </View>
                    ) : (
                        <Pressable onPress={pickImages} style={editstyles.placeholderContainer}>
                            <Ionicons name="camera-outline" size={40} color="#1A3C40" />
                            <Text style={editstyles.placeholderText}>Add photos</Text>
                        </Pressable>
                    )}
                </View>


            <View style={editstyles.form}>
                <Text style={editstyles.label}>Title</Text>
                <TextInput
                    style={editstyles.input}
                    value={title}
                    onChangeText={setTitle}
                    placeholder="e.g., Huge Moving Sale!"
                />

                <Text style={editstyles.label}>Address</Text>
                <TextInput
                    style={editstyles.input}
                    value={address}
                    onChangeText={setAddress}
                    placeholder="123 Main St"
                />

                <View style={editstyles.row}>
                    <View style={editstyles.halfInput}>
                        <Text style={editstyles.label}>Start Time</Text>
                        <TextInput
                            style={editstyles.input}
                            value={startTime}
                            onChangeText={setStartTime}
                            placeholder="08:00 AM"
                        />
                    </View>
                    <View style={editstyles.halfInput}>
                        <Text style={editstyles.label}>End Time</Text>
                        <TextInput
                            style={editstyles.input}
                            value={endTime}
                            onChangeText={setEndTime}
                            placeholder="02:00 PM"
                        />
                    </View>
                </View>

                <Text style={editstyles.label}>Description</Text>
                <TextInput
                    style={[editstyles.input, editstyles.textArea]}
                    value={description}
                    onChangeText={setDescription}
                    placeholder="What are you selling?"
                    multiline
                    numberOfLines={4}
                />
                <Text style={editstyles.label}>Change duration?</Text>
                <View style={editstyles.durationContainer}>
                    {[1,2,5,7,30].map((days) => (
                        <Pressable
                            key={days}
                            style={[editstyles.durationButton,
                                duration === days && editstyles.durationButtonActive
                            ]}
                            onPress={() => setDuration(days)}
                        >
                            <Text style={[
                                editstyles.durationText, 
                                duration === days && editstyles.durationTextActive
                            ]}>
                                {days} {days === 1? 'Day' : 'Days'}
                            </Text>
                        </Pressable>
                    ))}
                </View>

                <Pressable 
                    style={[editstyles.saveButton, saving && editstyles.saveButtonDisabled]} 
                    onPress={handleUpdatePost}
                    disabled={saving}
                >
                    {saving ? (
                        <ActivityIndicator color="white" />
                    ) : (
                        <Text style={editstyles.saveButtonText}>Save Changes</Text>
                    )}
                </Pressable>
            </View>
        </ScrollView>
    </KeyboardAvoidingView>
    );
}

const editstyles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f4f4f4' },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingTop: 30,
        paddingHorizontal: 20,
        paddingBottom: 20,
        backgroundColor: 'white',
        borderBottomWidth: 1,
        borderBottomColor: '#ddd',
    },
    backButton: { width: 40, height: 40, justifyContent: 'center' },
    headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#1A3C40' },

    imagepicker: { 
        width: '100%', 
        backgroundColor: '#eee',
        marginBottom: 10
    },
    deleteImageButton: { 
        position: 'absolute', 
        top: 15, 
        right: 15, 
        backgroundColor: 'rgba(0,0,0,0.6)', 
        padding: 8, 
        borderRadius: 20 
    },
    editPhotoButton: { 
        position: 'absolute', 
        bottom: 15, 
        right: 15, 
        backgroundColor: '#1A3C40', 
        flexDirection: 'row', 
        paddingVertical: 8, 
        paddingHorizontal: 12, 
        borderRadius: 15, 
        alignItems: 'center' 
    },
    editPhotoText: { 
        color: 'white', 
        marginLeft: 5, 
        fontWeight: 'bold' 
    },
    placeholderContainer: { 
        height: 250, 
        width: '100%', 
        justifyContent: 'center', 
        alignItems: 'center', 
        backgroundColor: '#e0e0e0',
        borderBottomWidth: 1,
        borderColor: '#ddd'
    },
    placeholderText: { 
        color: '#1A3C40', 
        marginTop: 10, 
        fontSize: 16, 
        fontWeight: 'bold' 
    },

    form: { padding: 20 },
    label: { fontSize: 16, fontWeight: '600', color: '#333', marginBottom: 8, marginTop: 15 },
    input: {
        backgroundColor: 'white',
        padding: 15,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: '#ddd',
        fontSize: 16,
    },
    row: { flexDirection: 'row', justifyContent: 'space-between' },
    halfInput: { width: '48%' },
    textArea: { height: 100, textAlignVertical: 'top' },

    durationContainer:{
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 5
    },
    durationButton:{
        flex: 1,
        padding: 5,
        backgroundColor: "#e0e0e0",
        borderRadius: 8,
        marginHorizontal: 4,
        alignItems: 'center',
    },
    durationButtonActive: {
        backgroundColor: "#1A3C40",
    },
    durationText: {
        color: '#666',
        fontWeight: 'bold',
        fontSize: 13,
    },
    durationTextActive: {
        color: 'white',
    },

    saveButton: {
        backgroundColor: '#1A3C40',
        padding: 15,
        borderRadius: 10,
        alignItems: 'center',
        marginTop: 30,
    },
    saveButtonDisabled: { backgroundColor: '#d6a5a5' },
    saveButtonText: { color: 'white', fontSize: 18, fontWeight: 'bold' },
});