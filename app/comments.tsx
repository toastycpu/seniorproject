import { View, Text, TextInput, Pressable, StyleSheet, FlatList, KeyboardAvoidingView, Platform, ActivityIndicator, Image, Alert} from 'react-native';
import { useState, useEffect } from 'react';
import { collection, addDoc, query, orderBy, onSnapshot, serverTimestamp } from 'firebase/firestore';
import { db, auth } from '../firebase/firebaseConfig';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

interface Comment {
    id: string;
    text: string;
    userId: string;
    userName: string;
    userAvatar?: string;
    createdAt: any;
}

export default function CommentsScreen() {
    const { postId } = useLocalSearchParams<{ postId: string }>();
    const router = useRouter();
    const user = auth.currentUser;

    const [comments, setComments] = useState<Comment[]>([]);
    const [newComment, setNewComment] = useState('');
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        if (!postId) return;

        const commentsRef = collection(db, 'sales', postId, 'comments');
        const q = query(commentsRef, orderBy('createdAt', 'asc'));

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const fetchedComments = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            })) as Comment[];
            
            setComments(fetchedComments);
            setLoading(false);
        });
        return () => unsubscribe();
    }, [postId]);

    const handlePostComment = async () => {
        if (!newComment.trim() || !user || !postId) return;

        const commentToSave = newComment.trim();
        setNewComment('');
        setSubmitting(true);
        try {
            const commentsRef = collection(db, 'sales', postId, 'comments');
            await addDoc(commentsRef, {
                text: newComment.trim(),
                userId: user.uid,
                userName: user.displayName || user.email?.split('@')[0] || 'Anonymous',
                userAvatar: user.photoURL || null,
                createdAt: serverTimestamp(),
            });
            
            setNewComment('');
        } catch (error) {
            console.log("Error posting comment:", error);
            setNewComment(commentToSave);
            Alert.alert("Error", "Could not post comment. Check your internet or Firebase Indexes.");
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) {
        return (
            <View style={[styles.container, styles.centered]}>
                <ActivityIndicator size="large" color="#1A3C40" />
            </View>
        );
    }

    return (
        <KeyboardAvoidingView 
            style={styles.container} 
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
        >

            <View style={styles.header}>
                <Pressable onPress={() => router.back()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color="#1A3C40" />
                </Pressable>
                <Text style={styles.headerTitle}>Comments</Text>
                <View style={{ width: 40 }} />
            </View>


            <FlatList
                data={comments}
                keyExtractor={(item) => item.id}
                contentContainerStyle={styles.listContainer}
                ListEmptyComponent={
                    <Text style={styles.emptyText}>No comments yet. Be the first!</Text>
                }
                renderItem={({ item }) => (
                    <View style={styles.commentRow}>
                        {/* Avatar on the left */}
                        {item.userAvatar ? (
                            <Image source={{ uri: item.userAvatar }} style={styles.commentAvatar} />
                        ) : (
                            <View style={[styles.commentAvatar, styles.avatarPlaceholder]}>
                                <Ionicons name="person" size={14} color="white" />
                            </View>
                        )}

                        {/* Bubble on the right */}
                        <View style={styles.commentBubble}>
                            <Text style={styles.commentName}>{item.userName}</Text>
                            <Text style={styles.commentText}>{item.text}</Text>
                        </View>
                    </View>
                )}
                />

            {/* Input Area */}
            <View style={styles.inputContainer}>
                <TextInput
                    style={styles.input}
                    value={newComment}
                    onChangeText={setNewComment}
                    placeholder="Add a comment..."
                    placeholderTextColor="#888"
                    multiline
                />
                <Pressable 
                    style={[styles.postButton, !newComment.trim() && styles.postButtonDisabled]}
                    onPress={handlePostComment}
                    disabled={!newComment.trim() || submitting}
                >
                    {submitting ? (
                        <ActivityIndicator color="white" size="small" />
                    ) : (
                        <Ionicons name="send" size={20} color="white" />
                    )}
                </Pressable>
            </View>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f4f4f4' },
    centered: { justifyContent: 'center', alignItems: 'center' },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingTop: 40,
        paddingHorizontal: 20,
        paddingBottom: 20,
        backgroundColor: 'white',
        borderBottomWidth: 1,
        borderBottomColor: '#ddd',
    },
    backButton: { width: 40, height: 40, justifyContent: 'center' },
    headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#1A3C40' },
    listContainer: { padding: 20, paddingBottom: 30 },
    emptyText: { 
        textAlign: 'center', 
        color: '#888', 
        fontStyle: 'italic', 
        marginTop: 40 
    },
    commentRow: {
        flexDirection: 'row',
        marginBottom: 12,
        alignItems: 'flex-end',
    },
    commentAvatar: {
        width: 30,
        height: 30,
        borderRadius: 15,
        marginRight: 8,
    },
    avatarPlaceholder: {
        backgroundColor: '#ccc',
        justifyContent: 'center',
        alignItems: 'center',
    },
    commentBubble: {
        backgroundColor: 'white',
        padding: 12,
        borderRadius: 15,
        borderBottomLeftRadius: 2,
        flex: 1,
        maxWidth: '80%',
        elevation: 1,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 1,
    },
    commentName: { fontSize: 12, fontWeight: 'bold', color: '#666', marginBottom: 4 },
    commentText: { fontSize: 15, color: '#333' },
    inputContainer: {
        flexDirection: 'row',
        padding: 15,
        paddingBottom: Platform.OS === 'ios' ? 30 : 15,
        backgroundColor: 'white',
        borderTopWidth: 1,
        borderTopColor: '#ddd',
        alignItems: 'flex-end',
    },
    input: {
        flex: 1,
        backgroundColor: '#f4f4f4',
        borderRadius: 20,
        paddingHorizontal: 15,
        paddingTop: 10,
        paddingBottom: 10,
        maxHeight: 100,
        fontSize: 16,
    },
    postButton: {
        backgroundColor: '#4CAF50',
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
        marginLeft: 10,
        marginBottom: 2,
    },
    postButtonDisabled: { backgroundColor: '#a5d6a7' }
});