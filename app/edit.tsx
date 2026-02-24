import { View, Text, TextInput, Pressable, StyleSheet, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { useState, useEffect } from 'react';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase/firebaseConfig';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

export default function EditScreen() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const router = useRouter();

    const [title, setTitle] = useState('');
    const [address, setAddress] = useState('');
    const [description, setDescription] = useState('');
    const [startTime, setStartTime] = useState('');
    const [endTime, setEndTime] = useState('');
    
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        const fetchPostData = async () => {
            if (!id) return;
            
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

    const handleUpdatePost = async () => {
        if (!title || !address || !description || !startTime || !endTime) {
            Alert.alert('Missing Info', 'Please fill out all fields.');
            return;
        }

        setSaving(true);
        console.log("Updating document in database...");

        try {
            const docRef = doc(db, 'sales', id);
            await updateDoc(docRef, {
                title,
                address,
                description,
                startTime,
                endTime,
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
            <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
                <ActivityIndicator size="large" color="#1A3C40" />
                <Text style={{ marginTop: 10, color: '#1A3C40' }}>Loading post details...</Text>
            </View>
        );
    }

    return (
        <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 40 }}>
            <View style={styles.header}>
                <Pressable onPress={() => router.back()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color="#1A3C40" />
                </Pressable>
                <Text style={styles.headerTitle}>Edit Post</Text>
                <View style={{ width: 40 }} />
            </View>

            <View style={styles.form}>
                <Text style={styles.label}>Title</Text>
                <TextInput
                    style={styles.input}
                    value={title}
                    onChangeText={setTitle}
                    placeholder="e.g., Huge Moving Sale!"
                />

                <Text style={styles.label}>Address</Text>
                <TextInput
                    style={styles.input}
                    value={address}
                    onChangeText={setAddress}
                    placeholder="123 Main St"
                />

                <View style={styles.row}>
                    <View style={styles.halfInput}>
                        <Text style={styles.label}>Start Time</Text>
                        <TextInput
                            style={styles.input}
                            value={startTime}
                            onChangeText={setStartTime}
                            placeholder="08:00 AM"
                        />
                    </View>
                    <View style={styles.halfInput}>
                        <Text style={styles.label}>End Time</Text>
                        <TextInput
                            style={styles.input}
                            value={endTime}
                            onChangeText={setEndTime}
                            placeholder="02:00 PM"
                        />
                    </View>
                </View>

                <Text style={styles.label}>Description</Text>
                <TextInput
                    style={[styles.input, styles.textArea]}
                    value={description}
                    onChangeText={setDescription}
                    placeholder="What are you selling?"
                    multiline
                    numberOfLines={4}
                />

                <Pressable 
                    style={[styles.saveButton, saving && styles.saveButtonDisabled]} 
                    onPress={handleUpdatePost}
                    disabled={saving}
                >
                    {saving ? (
                        <ActivityIndicator color="white" />
                    ) : (
                        <Text style={styles.saveButtonText}>Save Changes</Text>
                    )}
                </Pressable>
            </View>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f4f4f4' },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingTop: 60,
        paddingHorizontal: 20,
        paddingBottom: 20,
        backgroundColor: 'white',
        borderBottomWidth: 1,
        borderBottomColor: '#ddd',
    },
    backButton: { width: 40, height: 40, justifyContent: 'center' },
    headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#1A3C40' },
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
    saveButton: {
        backgroundColor: '#4CAF50',
        padding: 15,
        borderRadius: 10,
        alignItems: 'center',
        marginTop: 30,
    },
    saveButtonDisabled: { backgroundColor: '#a5d6a7' },
    saveButtonText: { color: 'white', fontSize: 18, fontWeight: 'bold' },
});