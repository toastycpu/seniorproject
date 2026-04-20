import { View, Text, Pressable, StyleSheet, FlatList, Image, Alert } from 'react-native';
import { useCallback, useState } from 'react';
import { collection, query, where, getDocs, orderBy, deleteDoc, doc, updateDoc, arrayRemove } from 'firebase/firestore';
import { signOut, updateProfile } from 'firebase/auth';
import { auth, db } from '../../firebase/firebaseConfig';
import { useFocusEffect, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';

interface Sale {
    id: string,
    title: string,
    address: string;
    image?: string;
    images?: string[];
    likes: number;
    description: string;
    expiresAt?: any;
}

export default function ProfileScreen() {
    const router = useRouter();
    const user = auth.currentUser;
    const [myPosts, setMyPosts] = useState<Sale[]>([]);
    const [profileImage, setProfileImage] = useState<string | null>(user?.photoURL || null);

    const [activeTab, setActiveTab] = useState<'listings' | 'saved'>('listings');
    const [savedPosts, setSavedPosts] = useState<Sale[]>([]);

    const pickProfileImage = async () => {
        let result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            aspect: [1, 1],
            quality: 1,
        });

        if (!result.canceled) {
            const localUri = result.assets[0].uri;
            
            if (auth.currentUser) {
                try {
                    const response = await fetch(localUri);
                    const blob = await response.blob();
                    const storage = getStorage();
                    const storageRef = ref(storage, `avatars/${auth.currentUser.uid}`);
                    await uploadBytes(storageRef, blob);

                    const downloadUrl = await getDownloadURL(storageRef);
                    await updateProfile(auth.currentUser, { photoURL: downloadUrl });
                    
                    setProfileImage(downloadUrl);
                    Alert.alert("Success", "Profile picture updated successfully!");
                } catch (error) {
                    console.log("Error updating profile photo:", error);
                    Alert.alert("Error", "Could not upload profile picture.");
                }
            }
        }
    }

    const fetchMyPosts = async () => {
        if (!user) return;
        try {
            const q = query(
                collection(db, 'sales'),
                where('postedBy', '==', user.uid),
                orderBy('createdAt', 'desc')
            );
            const snapshot = await getDocs(q);
            const posts: Sale[] = snapshot.docs.map((doc) => ({
                id: doc.id,
                ...doc.data(),
            })) as Sale[];
            setMyPosts(posts);
        } catch (error) {
            console.log("Error fetching posts:", error);
        }
    };

    const fetchSavedPosts = async () => {
        if (!auth.currentUser) return;
        
        try {
            const userId = auth.currentUser.uid;
            const salesRef = collection(db, 'sales');
            const q = query(salesRef, where('savedBy', 'array-contains', userId));
            
            const querySnapshot = await getDocs(q);
            const savedData = querySnapshot.docs.map((doc) => ({
                id: doc.id,
                ...doc.data(),
            })) as Sale[];
            setSavedPosts(savedData); 
            
        } catch (error) {
            console.log("Error fetching saved posts:", error);
        }
    };

    useFocusEffect(useCallback(() => {
        fetchMyPosts();
        fetchSavedPosts();
    }, [])
    );

    const handleDeletePost = (id: string) => {
        Alert.alert(
            "Delete Post",
            "Are you sure you want to delete this post? This cannot be undone.",
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Delete",
                    style: "destructive",
                    onPress: async () => {
                        try {
                            await deleteDoc(doc(db, 'sales', id));
                            setMyPosts(prevPosts => prevPosts.filter(post => post.id !== id));
                        } catch (error) {
                            console.log("Error deleting:", error);
                            Alert.alert("Error", "Could not delete post.");
                        }
                    }
                }
            ]
        );
    };

    const handleEditPost = (id: string) => {
        router.push({ pathname: '/create', params: { id: id } });
    };

    const handleLogout = async () => {
        await signOut(auth);
        router.replace('/');
    };

    const handleRemoveSaved = async (id: string) => {
        if (!user) return;
        try{
            const postRef = doc(db, 'sales', id);
            await updateDoc(postRef, {
                savedBy: arrayRemove(user.uid)
            });
            setSavedPosts(prevPosts => prevPosts.filter(post => post.id !== id));
        }catch (error) {
            console.log("Error removing saved post:", error);
            Alert.alert("Error", "Could not remove from saved list");
        }
    };

    const activePostsCount = myPosts.filter((item) => {
        if (!item.expiresAt) return true;
        
        const expirationDate = item.expiresAt.seconds 
            ? new Date(item.expiresAt.seconds * 1000) 
            : new Date(item.expiresAt);
            
        return expirationDate >= new Date();
    }).length;

    const ProfileHeader = () => (
        <View style={Profilestyle.headerContainer}>
            <Text style={Profilestyle.screenTitle}>Profile</Text>
            <Pressable onPress={pickProfileImage} style={Profilestyle.avatarContainer}>
                <View style={Profilestyle.avatar}>
                    {profileImage ? (
                        <Image source={{ uri: profileImage }} style={Profilestyle.avatarImage} />
                    ) : (
                        <Text style={Profilestyle.avatarText}>
                            {user?.email?.charAt(0).toUpperCase()}
                        </Text>
                    )}
                </View>
                <View style={Profilestyle.editIconBadge}>
                    <Ionicons name="camera" size={14} color="white" />
                </View>
            </Pressable>

            <Text style={Profilestyle.name}>
                {user?.displayName || "User"}
            </Text>
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
                <Pressable 
                    style={[Profilestyle.tabButton, activeTab === 'listings' && Profilestyle.activeTab]}
                    onPress={() => setActiveTab('listings')}
                >
                    <Ionicons name="grid-outline" size={20} color={activeTab === 'listings' ? '#1A3C40' : '#888'} />
                    <Text style={[Profilestyle.tabText, activeTab === 'listings' && Profilestyle.activeTabText]}>
                        My Listings
                    </Text>
                </Pressable>

                <Pressable 
                    style={[Profilestyle.tabButton, activeTab === 'saved' && Profilestyle.activeTab]}
                    onPress={() => setActiveTab('saved')}
                >
                    <Ionicons name="bookmark-outline" size={20} color={activeTab === 'saved' ? '#1A3C40' : '#888'} />
                    <Text style={[Profilestyle.tabText, activeTab === 'saved' && Profilestyle.activeTabText]}>
                        Saved
                    </Text>
                </Pressable>
            </View>
        </View>
    );

    return (
        <View style={Profilestyle.container}>
            <FlatList
                data={activeTab === 'listings' ? myPosts : savedPosts}
                keyExtractor={(item) => item.id}
                ListHeaderComponent={ProfileHeader}
                contentContainerStyle={{ paddingBottom: 40 }}
                showsVerticalScrollIndicator={false}
                ListEmptyComponent={
                    <Text style={Profilestyle.emptyText}>
                        {activeTab === 'listings' 
                            ? "You haven't posted anything yet." 
                            : "You haven't saved any posts yet."}
                    </Text>
                }
                renderItem={({ item }) => {
                    const isExpired = item.expiresAt && (
                        item.expiresAt.seconds 
                            ? new Date(item.expiresAt.seconds * 1000) 
                            : new Date(item.expiresAt)
                    ) < new Date();

                    return (
                        <View style={[Profilestyle.card, isExpired && { opacity: 0.7 }]}>
                            <Image
                                source={{ uri: item.images && item.images.length > 0 ? item.images[0] : item.image }}
                                style={Profilestyle.image}
                            />
                            <View style={Profilestyle.cardContent}>
                                <View style={Profilestyle.titleRow}>
                                    <View style={{ flex: 1, paddingRight: 10 }}>
                                        <Text style={Profilestyle.cardTitle}>{item.title}</Text>
                                        <Text style={Profilestyle.cardAddress}>{item.address}</Text>
                                        

                                        {isExpired && (
                                            <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
                                                <Ionicons name="warning" size={16} color="#d32f2f" style={{ marginRight: 4 }} />
                                                <Text style={{ color: '#d32f2f', fontWeight: 'bold' }}>
                                                    This post has expired
                                                </Text>
                                            </View>
                                        )}
                                    </View>
                                    {activeTab === 'listings' && (
                                        <View style={Profilestyle.editDeleteContainer}>
                                            <Pressable onPress={() => handleEditPost(item.id)} style={{ marginRight: 15 }}>
                                                <Ionicons name="pencil" size={20} color="#4CAF50" />
                                            </Pressable>
                                            <Pressable onPress={() => handleDeletePost(item.id)}>
                                                <Ionicons name="trash-outline" size={20} color="#ff4444" />
                                            </Pressable>
                                        </View>
                                    )}
                                    {activeTab === 'saved' && (
                                        <View style={Profilestyle.editDeleteContainer}>
                                            <Pressable onPress={() => handleRemoveSaved(item.id)}>
                                                <Ionicons name="bookmark" size={24} color="#1A3C40" />
                                            </Pressable>
                                        </View>
                                    )}
                                </View>

                                
                                <View style={Profilestyle.actionRow}>
                                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                        <View style={Profilestyle.likesContainer}>
                                            <Ionicons name="heart-outline" size={23} color="#1A3C40" />
                                            <Text style={Profilestyle.actionText}>{item.likes || 0}</Text>
                                        </View>
                                        <Pressable
                                            onPress={() => router.push(`/comments?postId=${item.id}`)}
                                            style={{ flexDirection: 'row', alignItems: 'center', marginLeft: 15 }}
                                        >
                                            <Ionicons name="chatbubble-outline" size={20} color="#1A3C40" />
                                            <Text style={Profilestyle.actionText}>Comment</Text>
                                        </Pressable>
                                    </View>
                                </View>
                            </View>
                        </View>
                    );
                }}
            />
        </View>
    );
}

const Profilestyle = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f4f4f4' },
    headerContainer: { alignItems: 'center', paddingTop: 60, paddingHorizontal: 20 },
    screenTitle: { fontSize: 24, fontWeight: 'bold', marginBottom: 20, color: '#1A3C40' },
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