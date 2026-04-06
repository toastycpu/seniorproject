import { View, Text, TextInput, Pressable, StyleSheet, FlatList, KeyboardAvoidingView, Platform, ActivityIndicator, Image, Alert } from 'react-native';
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
    replyToId?: string;
    replyToName?: string;
    replyToUserId?: string;
    replies?: Comment[];
}


const CommentNode = ({ item, level = 0, onReply }: { item: Comment, level: number, onReply: (c: Comment) => void }) => {
    const indent = Math.min(level * 30, 90);
    const avatarSize = level > 0 ? 24 : 30;

    return (
        <View>
            <View style={[styles.commentRow, { marginLeft: indent }]}>
                {item.userAvatar ? (
                    <Image 
                        source={{ uri: item.userAvatar }} 
                        style={[styles.commentAvatar, { width: avatarSize, height: avatarSize, borderRadius: avatarSize / 2 }]} 
                    />
                ) : (
                    <View style={[styles.commentAvatar, styles.avatarPlaceholder, { width: avatarSize, height: avatarSize, borderRadius: avatarSize / 2 }]}>
                        <Ionicons name="person" size={avatarSize * 0.5} color="white" />
                    </View>
                )}

                <View style={{ flex: 1 }}>
                    <View style={styles.commentBubble}>
                        <Text style={styles.commentName}>{item.userName}</Text>
                        
                        {item.replyToName && (
                            <Text style={styles.replyingToText}>
                                Replying to @{item.replyToName}
                            </Text>
                        )}
                        
                        <Text style={styles.commentText}>{item.text}</Text>
                    </View>
                    
                    <Pressable 
                        style={styles.replyButton} 
                        onPress={() => onReply(item)}
                    >
                        <Text style={styles.replyButtonText}>Reply</Text>
                    </Pressable>
                </View>
            </View>

            {item.replies && item.replies.length > 0 && (
                <View>
                    {item.replies.map((reply) => (
                        <CommentNode 
                            key={reply.id} 
                            item={reply} 
                            level={level + 1} 
                            onReply={onReply} 
                        />
                    ))}
                </View>
            )}
        </View>
    );
};

export default function CommentsScreen() {
    const { postId } = useLocalSearchParams<{ postId: string }>();
    const router = useRouter();
    const user = auth.currentUser;

    const [comments, setComments] = useState<Comment[]>([]);
    const [newComment, setNewComment] = useState('');
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [replyingTo, setReplyingTo] = useState<Comment | null>(null);

    useEffect(() => {
        if (!postId) return;

        const commentsRef = collection(db, 'sales', postId, 'comments');
        const q = query(commentsRef, orderBy('createdAt', 'asc'));

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const fetchedComments = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            })) as Comment[];
        
            const commentMap = new Map<string, Comment>();
            const rootComments: Comment[] = [];

            fetchedComments.forEach(c => {
                commentMap.set(c.id, { ...c, replies: [] });
            });

            fetchedComments.forEach(c => {
                if (c.replyToId && commentMap.has(c.replyToId)) {
                    commentMap.get(c.replyToId)!.replies!.push(commentMap.get(c.id)!);
                } else {
                    rootComments.push(commentMap.get(c.id)!);
                }
            });
            setComments(rootComments);
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
            const commentData: any = {
                text: commentToSave,
                userId: user.uid,
                userName: user.displayName || user.email?.split('@')[0] || 'Anonymous',
                userAvatar: user.photoURL || null,
                createdAt: serverTimestamp(),
            };

            if (replyingTo) {
                commentData.replyToId = replyingTo.id;
                commentData.replyToName = replyingTo.userName;
                commentData.replyToUserId = replyingTo.userId;
            }

            await addDoc(commentsRef, commentData);
            
            setNewComment('');
            setReplyingTo(null);
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
                    <CommentNode item={item} level={0} onReply={setReplyingTo} />
                )}
            />

            <View style={styles.inputWrapper}>
                {replyingTo && (
                    <View style={styles.replyBanner}>
                        <Text style={styles.replyBannerText}>
                            Replying to <Text style={{fontWeight: 'bold'}}>{replyingTo.userName}</Text>
                        </Text>
                        <Pressable onPress={() => setReplyingTo(null)}>
                            <Ionicons name="close-circle" size={20} color="#888" />
                        </Pressable>
                    </View>
                )}

                <View style={styles.inputContainer}>
                    <TextInput
                        style={styles.input}
                        value={newComment}
                        onChangeText={setNewComment}
                        placeholder={replyingTo ? `Reply to ${replyingTo.userName}...` : "Add a comment..."}
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
        marginBottom: 16,
        alignItems: 'flex-start',
    },
    commentAvatar: {
        marginRight: 8,
        marginTop: 4,
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
        borderTopLeftRadius: 2,
        alignSelf: 'flex-start',
        maxWidth: '95%',
        elevation: 1,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 1,
    },
    commentName: { fontSize: 12, fontWeight: 'bold', color: '#666', marginBottom: 4 },
    commentText: { fontSize: 15, color: '#333' },

    replyingToText: { fontSize: 12, color: '#007AFF', marginBottom: 4, fontStyle: 'italic' },
    replyButton: { marginTop: 4, marginLeft: 12 },
    replyButtonText: { fontSize: 12, color: '#888', fontWeight: 'bold' },
    
    inputWrapper: {
        backgroundColor: 'white',
        borderTopWidth: 1,
        borderTopColor: '#ddd',
    },
    replyBanner: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: '#f0f0f0',
        paddingHorizontal: 15,
        paddingVertical: 10,
        borderTopLeftRadius: 15,
        borderTopRightRadius: 15,
    },
    replyBannerText: { fontSize: 13, color: '#555' },

    inputContainer: {
        flexDirection: 'row',
        padding: 15,
        paddingBottom: Platform.OS === 'ios' ? 30 : 15,
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