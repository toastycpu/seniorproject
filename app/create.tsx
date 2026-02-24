import {View, Text, Image, TextInput,
        StyleSheet, Pressable, ScrollView, Alert, ActivityIndicator,
        KeyboardAvoidingView, Platform, FlatList, Dimensions,
} from 'react-native';
import {useState} from 'react';
import {useRouter} from 'expo-router';
import {collection, addDoc, serverTimestamp} from 'firebase/firestore';
import {db, auth} from '../firebase/firebaseConfig';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import DateTimePicker from '@react-native-community/datetimepicker';

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

    const { width: screenWidth } = Dimensions.get('window');
    const imageWidth = screenWidth - 40;
    const removeImage = (indexToRemove: number) => {
        setImages(currentImages => currentImages.filter((_, index) => index !== indexToRemove));
    };


    const pickImages = async () => {
            let result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                allowsMultipleSelection: true,
                quality: 1,
            });

            if (!result.canceled) {
                const selectedUris = result.assets.map(asset => asset.uri);
                setImages(prevImages => [...prevImages, ...selectedUris]);
            }
    };

    const formatTime = (date: Date) => {
            return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        };

    const handleCreatePost = async () => {  
        if (!title || !address || !description || !startTime || !endTime || images.length === 0) {
            Alert.alert('Missing Info', 'Please fill out all fields');
            return;
        }
        setLoading(true);
        console.log("Starting database write...");
        try {
            await addDoc(collection(db, 'sales'), {
                title,
                address,
                description,
                startTime,
                endTime,
                categories: ['Furniture'],
                images: images,
                likes: 0,
                postedBy: auth.currentUser?.uid,
                authorName: auth.currentUser?.displayName || auth.currentUser?.email || 'Anonymous',
                authorAvatar: auth.currentUser?.photoURL || null,
                postedDate: new Date().toISOString().split('T')[0],
                createdAt: serverTimestamp(),
            });
            console.log("Database write finished!");
            setLoading(false);
            Alert.alert('Success', 'Your sale was posted!');
            router.back();
        } catch (error) {
            setLoading(false);
            console.log("Error posting:", error);
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
                behavior={Platform.OS === 'ios' ? 'padding': 'height'}
                style={{flex:1}}
            >
                <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{paddingBottom: 50}}>
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
                                            {/* New Delete Button */}
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
                                <Ionicons name="camera-outline" size={40} color="#1A3C40"/>
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
                    <TextInput 
                        style={createstyles.input} 
                        placeholder="e.g. 123 sunset blv." 
                        value={address} onChangeText={setAddress} 
                    />
                    <Text style={createstyles.label}>Description</Text>
                    <TextInput 
                        style={[createstyles.input, createstyles.textArea]} 
                        placeholder="What are you selling?" 
                        value={description} onChangeText={setDescription}
                        multiline
                    />


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
    postButton: { 
        backgroundColor: '#1A3C40', 
        padding: 16, 
        borderRadius: 12, 
        marginTop: 30, 
        alignItems: 'center' },
    postButtonText: {color: 'white', fontWeight: 'bold', fontSize: 16 },
});