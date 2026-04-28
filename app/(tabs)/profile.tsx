import { View, Text, Pressable, StyleSheet, FlatList, Image, Alert } from 'react-native';
import { useCallback, useState, useMemo } from 'react';
import { collection, query, where, getDocs, orderBy, deleteDoc, doc, updateDoc, arrayRemove, arrayUnion } from 'firebase/firestore';
import { signOut, updateProfile } from 'firebase/auth';
import { auth, db } from '../../firebase/firebaseConfig';
import { useFocusEffect, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import PostDetailModal from '@/components/postpopup'
import ImageViewing from 'react-native-image-viewing';
import { Stack } from 'expo-router';

interface Sale {
    id: string;
    title: string;
    address: string;
    image?: string;
    images?: string[];
    likes: number;
    description: string;
    expiresAt?: any;
    likedBy?: string[];
    savedBy?: string[];
}


const isPostExpired = (expiresAt: any) => {
    if (!expiresAt || expiresAt === 'Permanent' || expiresAt === 'none') return false;
    const expirationDate = expiresAt.seconds ? new Date(expiresAt.seconds * 1000) : new Date(expiresAt);
    return expirationDate < new Date();
};

export default function ProfileScreen() {
    const router = useRouter();
    const user = auth.currentUser;

    const [myPosts, setMyPosts] = useState<Sale[]>([]);
    const [savedPosts, setSavedPosts] = useState<Sale[]>([]);
    const [activeTab, setActiveTab] = useState<'listings' | 'saved'>('listings');
    const [profileImage, setProfileImage] = useState<string | null>(user?.photoURL || null);
    
    const [modalVisible, setModalVisible] = useState(false);
    const [selectedPost, setSelectedPost] = useState<Sale | null>(null);
    const [isViewerVisible, setIsViewerVisible] = useState(false);
    const [viewerImages, setViewerImages] = useState<any[]>([]);
    const [currentImageIndex, setCurrentImageIndex] = useState(0);

    const fetchMyPosts = async () => {
        if (!user) return;
        try {
            const q = query(collection(db, 'sales'), where('postedBy', '==', user.uid), orderBy('createdAt', 'desc'));
            const snapshot = await getDocs(q);
            setMyPosts(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Sale[]);
        } catch (error) { console.log("Error fetching posts:", error); }
    };

    const fetchSavedPosts = async () => {
        if (!user) return;
        try {
            const q = query(collection(db, 'sales'), where('savedBy', 'array-contains', user.uid));
            const snapshot = await getDocs(q);
            setSavedPosts(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Sale[]);
        } catch (error) { console.log("Error fetching saved posts:", error); }
    };

    useFocusEffect(useCallback(() => {
        fetchMyPosts();
        fetchSavedPosts();
    }, []));

    const uploadImageAndUpdateProfile = async (localUri: string) => {
        if (!user) return;
        try {
            const response = await fetch(localUri);
            const blob = await response.blob();
            const storage = getStorage();
            const storageRef = ref(storage, `avatars/${user.uid}`);
            await uploadBytes(storageRef, blob);
            const downloadUrl = await getDownloadURL(storageRef);
            await updateProfile(user, { photoURL: downloadUrl });
            setProfileImage(downloadUrl);
            Alert.alert("Success", "Profile picture updated!");
        } catch (error) { Alert.alert("Error", "Could not upload profile picture."); }
    };

    const handleProfileImagePress = () => {
        Alert.alert("Update Profile Picture", "Choose a source", [
            { text: "Take Photo", onPress: async () => {
                const res = await ImagePicker.launchCameraAsync({ allowsEditing: true, aspect: [1, 1], quality: 0.5 });
                if (!res.canceled) uploadImageAndUpdateProfile(res.assets[0].uri);
            }},
            { text: "Gallery", onPress: async () => {
                const res = await ImagePicker.launchImageLibraryAsync({ allowsEditing: true, aspect: [1, 1], quality: 0.5 });
                if (!res.canceled) uploadImageAndUpdateProfile(res.assets[0].uri);
            }},
            { text: "Cancel", style: "cancel" }
        ]);
    };

    const handleDeletePost = (id: string) => {
        Alert.alert("Delete Post", "Are you sure? This cannot be undone.", [
            { text: "Cancel", style: "cancel" },
            { text: "Delete", style: "destructive", onPress: async () => {
                await deleteDoc(doc(db, 'sales', id));
                setMyPosts(prev => prev.filter(p => p.id !== id));
            }}
        ]);
    };

    const handleLogout = async () => {
        await signOut(auth);
        router.replace('/');
    };

    const handleLike = async (post: Sale) => {
        if (!user) return;
        const postRef = doc(db, 'sales', post.id);
        const isLiked = post.likedBy?.includes(user.uid);
        try {
            await updateDoc(postRef, {
                likedBy: isLiked ? arrayRemove(user.uid) : arrayUnion(user.uid),
                likes: isLiked ? Math.max(0, (post.likes || 0) - 1) : (post.likes || 0) + 1
            });
            activeTab === 'listings' ? fetchMyPosts() : fetchSavedPosts();
            if (selectedPost?.id === post.id) {
                setSelectedPost({
                    ...selectedPost,
                    likedBy: isLiked ? selectedPost.likedBy?.filter(id => id !== user.uid) : [...(selectedPost.likedBy || []), user.uid],
                    likes: isLiked ? Math.max(0, (selectedPost.likes || 0) - 1) : (selectedPost.likes || 0) + 1
                });
            }
        } catch (e) { console.log(e); }
    };

    const handleSaveFromModal = async (post: Sale) => {
        if (!user) return;
        const isSaved = post.savedBy?.includes(user.uid);
        const postRef = doc(db, 'sales', post.id);
        try {
            await updateDoc(postRef, { savedBy: isSaved ? arrayRemove(user.uid) : arrayUnion(user.uid) });
            fetchSavedPosts(); 
            fetchMyPosts();
            if (selectedPost?.id === post.id) {
                setSelectedPost({
                    ...selectedPost,
                    savedBy: isSaved ? selectedPost.savedBy?.filter(id => id !== user.uid) : [...(selectedPost.savedBy || []), user.uid]
                });
            }
        } catch (e) { console.log(e); }
    };

    const activePostsCount = useMemo(() => myPosts.filter(item => !isPostExpired(item.expiresAt)).length, [myPosts]);

    const ProfileHeader = () => (
        <View style={Profilestyle.headerContainer}>
            <Pressable onPress={handleProfileImagePress} style={Profilestyle.avatarContainer}>
                <View style={Profilestyle.avatar}>
                    {profileImage ? (
                        <Image source={{ uri: profileImage }} style={Profilestyle.avatarImage} />
                    ) : (
                        <Text style={Profilestyle.avatarText}>{user?.email?.charAt(0).toUpperCase()}</Text>
                    )}
                </View>
                <View style={Profilestyle.editIconBadge}><Ionicons name="camera" size={14} color="white" /></View>
            </Pressable>

            <Text style={Profilestyle.name}>{user?.displayName || "User"}</Text>
            <Text style={Profilestyle.email}>{user?.email}</Text>
            
            <View style={Profilestyle.statsContainer}>
                <Text style={Profilestyle.statNumber}>{activePostsCount}</Text>
                <Text style={Profilestyle.statLabel}>Active Posts</Text>
            </View>

            <Pressable style={Profilestyle.logoutButton} onPress={handleLogout}>
                <Text style={Profilestyle.logoutText}>Log Out</Text>
            </Pressable>

            <View style={Profilestyle.divider} />
            <View style={Profilestyle.tabContainer}>
                <Pressable style={[Profilestyle.tabButton, activeTab === 'listings' && Profilestyle.activeTab]} onPress={() => setActiveTab('listings')}>
                    <Ionicons name="grid-outline" size={20} color={activeTab === 'listings' ? '#1A3C40' : '#888'} />
                    <Text style={[Profilestyle.tabText, activeTab === 'listings' && Profilestyle.activeTabText]}>My Listings</Text>
                </Pressable>
                <Pressable style={[Profilestyle.tabButton, activeTab === 'saved' && Profilestyle.activeTab]} onPress={() => setActiveTab('saved')}>
                    <Ionicons name="bookmark-outline" size={20} color={activeTab === 'saved' ? '#1A3C40' : '#888'} />
                    <Text style={[Profilestyle.tabText, activeTab === 'saved' && Profilestyle.activeTabText]}>Saved</Text>
                </Pressable>
            </View>
        </View>
    );

    return (
        <View style={Profilestyle.container}>
            <Stack.Screen 
                options={{
                    headerShown: true,
                    headerTitle: "Profile",
                    headerTitleAlign: 'center',
                    headerStyle: { 
                        backgroundColor: '#f7f2ed',
                    },
                    headerTitleStyle: {
                        fontSize: 24,
                        fontWeight: 'bold',
                        color: '#1A3C40',
                    },
                    headerTintColor: '#fff',
                    headerShadowVisible: false,
                }} 
            />
            <FlatList
                data={activeTab === 'listings' ? myPosts : savedPosts}
                keyExtractor={(item) => item.id}
                ListHeaderComponent={ProfileHeader}
                contentContainerStyle={{ paddingBottom: 40 }}
                showsVerticalScrollIndicator={false}
                ListEmptyComponent={
                    <Text style={Profilestyle.emptyText}>
                        {activeTab === 'listings' ? "No listings yet." : "No saved posts yet."}
                    </Text>
                }
                renderItem={({ item }) => {
                    const expired = isPostExpired(item.expiresAt);
                    return (
                        <Pressable onPress={() => { setSelectedPost(item); setModalVisible(true); }}>
                            <View style={[Profilestyle.card, expired && { opacity: 0.7 }]}>
                                <Image source={{ uri: item.images?.[0] || item.image }} style={Profilestyle.image} />
                                <View style={Profilestyle.cardContent}>
                                    <View style={Profilestyle.titleRow}>
                                        <View style={{ flex: 1, paddingRight: 10 }}>
                                            <Text style={Profilestyle.cardTitle}>{item.title}</Text>
                                            <Text style={Profilestyle.cardAddress}>{item.address}</Text>
                                            {expired && (
                                                <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
                                                    <Ionicons name="warning" size={16} color="#d32f2f" style={{ marginRight: 4 }} />
                                                    <Text style={{ color: '#d32f2f', fontWeight: 'bold' }}>Expired</Text>
                                                </View>
                                            )}
                                        </View>
                                        
                                        <View style={Profilestyle.editDeleteContainer}>
                                            {activeTab === 'listings' ? (
                                                <>
                                                    <Pressable onPress={(e) => { e.stopPropagation(); router.push({ pathname: '/create', params: { id: item.id } }); }} style={{ marginRight: 15 }}>
                                                        <Ionicons name="pencil" size={20} color="#4CAF50" />
                                                    </Pressable>
                                                    <Pressable onPress={(e) => { e.stopPropagation(); handleDeletePost(item.id); }}>
                                                        <Ionicons name="trash-outline" size={20} color="#ff4444" />
                                                    </Pressable>
                                                </>
                                            ) : (
                                                <Pressable onPress={(e) => { e.stopPropagation(); handleSaveFromModal(item); }}>
                                                    <Ionicons name="bookmark" size={24} color="#1A3C40" />
                                                </Pressable>
                                            )}
                                        </View>
                                    </View>

                                    <View style={Profilestyle.actionRow}>
                                        <View style={Profilestyle.likesContainer}>
                                            <Ionicons name="heart-outline" size={23} color="#1A3C40" />
                                            <Text style={Profilestyle.actionText}>{item.likes || 0}</Text>
                                        </View>
                                        <Pressable onPress={(e) => { e.stopPropagation(); router.push(`/comments?postId=${item.id}`); }} style={{ flexDirection: 'row', alignItems: 'center', marginLeft: 15 }}>
                                            <Ionicons name="chatbubble-outline" size={20} color="#1A3C40" />
                                            <Text style={Profilestyle.actionText}>Comment</Text>
                                        </Pressable>
                                    </View>
                                </View>
                            </View>
                        </Pressable>
                    );
                }}
            />

            <PostDetailModal
                visible={modalVisible}
                post={selectedPost}
                onClose={() => { setModalVisible(false); setSelectedPost(null); }}
                auth={auth}
                router={router}
                handleLike={handleLike}
                handleSave={handleSaveFromModal}
                setViewerImages={setViewerImages}
                setCurrentImageIndex={setCurrentImageIndex}
                setIsViewerVisible={setIsViewerVisible}
            />

            <ImageViewing
                images={viewerImages}
                imageIndex={currentImageIndex}
                visible={isViewerVisible}
                onRequestClose={() => setIsViewerVisible(false)}
            />
        </View>
    );
}

const Profilestyle = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f7f2ed' },
    headerContainer: { alignItems: 'center', paddingTop: 20, paddingHorizontal: 20 },   
    titleRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        width: '100%',
    },

    avatarContainer: { position: 'relative', marginBottom: 15 },
    avatar: {
        width: 100,
        height: 100,
        borderRadius: 50,
        backgroundColor: '#1A3C40',
        justifyContent: 'center',
        alignItems: 'center',
        overflow: 'hidden'
    },
    avatarImage: { width: '100%', height: '100%' },
    avatarText: { fontSize: 40, color: 'white', fontWeight: 'bold' },
    name: { fontSize: 22, fontWeight: 'bold', color: '#333' },
    editIconBadge: {
        position: 'absolute',
        bottom: 0,
        right: 0,
        backgroundColor: '#2e7d32',
        width: 30,
        height: 30,
        borderRadius: 15,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: '#f4f4f4'
    },
    email: { fontSize: 14, color: '#666', marginBottom: 15 },

    statsContainer: { alignItems: 'center', marginBottom: 20 },
    statNumber: { fontSize: 20, fontWeight: 'bold', color: '#1A3C40' },
    statLabel: { fontSize: 14, color: '#666' },

    logoutButton: {
        backgroundColor: '#ffebee',
        paddingVertical: 10,
        paddingHorizontal: 20,
        borderRadius: 20,
        marginBottom: 20
    },
    logoutText: { color: '#d32f2f', fontWeight: '600' },
    divider: { height: 1, width: '100%', backgroundColor: '#ddd', marginBottom: 5 },


    tabContainer: { flexDirection: 'row', width: '100%', marginBottom: 15 },
    tabButton: {
        flex: 1,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: 12,
        borderBottomWidth: 2,
        borderBottomColor: 'transparent'
    },
    activeTab: { borderBottomColor: '#1A3C40' },
    tabText: { fontSize: 16, fontWeight: '600', color: '#888', marginLeft: 8 },
    activeTabText: { color: '#1A3C40' },

    card: {
        backgroundColor: 'white',
        borderRadius: 12,
        marginBottom: 15,
        marginHorizontal: 20,
        overflow: 'hidden',
        elevation: 2
    },
    image: { width: '100%', height: 150 },
    cardContent: { padding: 12 },
    cardTitle: { fontSize: 16, fontWeight: 'bold', color: '#333' },
    cardAddress: { fontSize: 14, color: '#666', marginVertical: 4 },

    actionRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: 15,
        borderTopWidth: 1,
        borderTopColor: '#f0f0f0',
        paddingTop: 15
    },
    likesContainer: { flexDirection: 'row', alignItems: 'center', marginLeft: 5 },
    actionText: { marginLeft: 5, color: '#555' },
    editDeleteContainer: { flexDirection: 'row', alignItems: 'center', paddingLeft: 30 },
    emptyText: { textAlign: 'center', marginTop: 20, color: '#888', fontStyle: 'italic' },
});