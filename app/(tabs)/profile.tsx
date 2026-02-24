import {View, Text, Pressable, StyleSheet, FlatList, Image, Alert} from 'react-native';
import {useCallback, useState} from 'react';
import {collection, query, where, getDocs, orderBy, deleteDoc, doc} from 'firebase/firestore';
import {signOut, updateProfile} from 'firebase/auth';
import {auth, db} from '../../firebase/firebaseConfig';
import {useFocusEffect, useRouter} from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';

interface Sale {
    id: string,
    title: string,
    address: string;
    image?: string;
    images?: string[];
    likes: number;
    description: string;
}

export default function ProfileScreen(){
    const router = useRouter();
    const user = auth.currentUser;
    const [myPosts, setMyPosts] = useState<Sale[]>([]);
    const [profileImage, setProfileImage] = useState<string | null>(null);

    const pickProfileImage = async () => {
        let result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            aspect: [1, 1],
            quality: 1,
        });

        if (!result.canceled) {
            const imageUri = result.assets[0].uri;
            setProfileImage(imageUri);
            if (auth.currentUser) {
                try {
                    await updateProfile(auth.currentUser, { photoURL: imageUri });
                } catch (error) {
                    console.log("Error updating profile photo:", error);
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

    useFocusEffect( useCallback(() => {
        fetchMyPosts();
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
        router.push(`/edit?Id=${id}`);
    };

    const handleLogout = async () => {
        await signOut(auth);
        router.replace('/');
    };

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
                <Text style={Profilestyle.statNumber}>{myPosts.length}</Text>
                <Text style={Profilestyle.statLabel}>Active Posts</Text>
            </View>

            <Pressable style={Profilestyle.logoutButton} onPress={handleLogout}>
                <Text style={Profilestyle.logoutText}>Log Out</Text>
            </Pressable>

            <View style={Profilestyle.divider} />
            <Text style={Profilestyle.sectionTitle}>My Listings</Text>
        </View>
    );

    return (
        <View style={Profilestyle.container}>
            <FlatList
                data={myPosts}
                keyExtractor={(item) => item.id}
                ListHeaderComponent={ProfileHeader}
                contentContainerStyle={{ paddingBottom: 40 }}
                showsVerticalScrollIndicator={false}
                ListEmptyComponent={
                    <Text style={Profilestyle.emptyText}>You haven't posted anything yet.</Text>
                }
                renderItem={({ item }) => (
                    <View style={Profilestyle.card}>
                        <Image 
                            source={{ uri: item.images && item.images.length > 0 ? item.images[0] : item.image }} 
                            style={Profilestyle.image} 
                        />
                        <View style={Profilestyle.cardContent}>
                            <View style={Profilestyle.titleRow}>
                                    <View style={{ flex: 1, paddingRight: 10 }}>
                                        <Text style={Profilestyle.cardTitle}>{item.title}</Text>
                                        <Text style={Profilestyle.cardAddress}>{item.address}</Text>
                                    </View>
                                    
                                    <View style={Profilestyle.editDeleteContainer}>
                                        <Pressable onPress={() => handleEditPost(item.id)} style={{ marginRight: 15 }}>
                                            <Ionicons name="pencil" size={20} color="#4CAF50" />
                                        </Pressable>
                                        <Pressable onPress={() => handleDeletePost(item.id)}>
                                            <Ionicons name="trash-outline" size={20} color="#ff4444" />
                                        </Pressable>
                                    </View>
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
                )}
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
    divider: { height: 1, width: '100%', backgroundColor: '#ddd', marginBottom: 20 },
    sectionTitle: { 
        fontSize: 18, 
        fontWeight: 'bold', 
        alignSelf: 'flex-start', 
        marginBottom: 10, color: '#333' 
    },

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
    likesContainer: {flexDirection: 'row', alignItems: 'center', marginLeft: 5},
    actionText: { marginLeft: 5, color: '#555' },
    editDeleteContainer: { flexDirection: 'row', alignItems: 'center', paddingLeft: 30},
    emptyText: { textAlign: 'center', marginTop: 20, color: '#888', fontStyle: 'italic' },
});