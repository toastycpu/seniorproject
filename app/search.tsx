import { View, Text, TextInput, StyleSheet, Pressable, FlatList, ActivityIndicator, Image, Alert } from 'react-native';
import { useState, useEffect } from 'react';
import { useGlobalSearchParams, useRouter } from 'expo-router';
import { collection, getDocs, query, where, doc, updateDoc, arrayUnion, arrayRemove, increment } from 'firebase/firestore';
import { Ionicons } from '@expo/vector-icons';
import { db, auth } from '../firebase/firebaseConfig';
import { StatusBar } from 'expo-status-bar';
import PostDetailModal from '@/components/postpopup';
import ImageViewing from 'react-native-image-viewing';

interface Sale {
    id: string;
    title: string;
    address: string;
    description: string;
    startTime: string;
    endTime: string;
    image?: string;
    images?: string[];
    likes: number;
    postedBy: string;
    authorName?: string;
    authorAvatar?: string;
    postedDate: string;
    expiresAt?: any;
    latitude?: number;
    longitude?: number;
    savedBy?: string[];
    likedBy?: string[];
    commentsCount?: number;
    daysOpen?: string[];
    price?: string;
    isOwnPrice?: boolean;
}

export default function SearchScreen() {
    const router = useRouter();
    const [searchQuery, setSearchQuery] = useState('');
    const [allSales, setAllSales] = useState<Sale[]>([]);
    const [loading, setLoading] = useState(true);

    const [selectedPost, setSelectedPost] = useState<Sale | null>(null);
    const [modalVisible, setModalVisible] = useState(false);

    const [viewerImages, setViewerImages] = useState<{ uri: string }[]>([]);
    const [isViewerVisible, setIsViewerVisible] = useState(false);
    const [currentImageIndex, setCurrentImageIndex] = useState(0);

    const headerColor = '#E8F1F2';
    const bodyColor = '#FFFFFF';

    const { selectedId } = useGlobalSearchParams();

    useEffect(() => {
        if (selectedId && allSales.length > 0) {
            const postToOpen = allSales.find(sale => sale.id === selectedId);

            if (postToOpen) {
                setSelectedPost(postToOpen);
                setModalVisible(true);
                router.setParams({ selectedId: '' });
            }
        }
    }, [selectedId, allSales])

    useEffect(() => {
        const fetchAllActiveSales = async () => {
            try {
                const now = new Date();
                const salesRef = collection(db, 'sales');
                const q = query(salesRef, where('expiresAt', '>', now));
                const querySnapshot = await getDocs(q);
                const fetchedSales = querySnapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                })) as Sale[];
                setAllSales(fetchedSales);
            } catch (error) {
                console.error("error fetching for search:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchAllActiveSales();
    }, []);

    const handleSave = async (post: Sale) => {
        if (!auth.currentUser) {
            Alert.alert("Not logged in", "You must be logged in to save post");
            return;
        }
        const userId = auth.currentUser.uid;
        const isSaved = post.savedBy?.includes(userId);
        const postRef = doc(db, 'sales', post.id);

        try {
            setAllSales((currentSales) =>
                currentSales.map((p) => {
                    if (p.id === post.id) {
                        const newSavedBy = isSaved
                            ? (p.savedBy || []).filter(id => id !== userId)
                            : [...(p.savedBy || []), userId];
                        return { ...p, savedBy: newSavedBy };
                    }
                    return p;
                })
            );
            await updateDoc(postRef, {
                savedBy: isSaved ? arrayRemove(userId) : arrayUnion(userId)
            });
        } catch (error) {
            Alert.alert("Error", "Could not save the post. Please try again.");
        }
    };

    const handleLike = async (post: Sale) => {
        if (!auth.currentUser) {
            Alert.alert("Not logged in", "You must be logged in to like a post.");
            return;
        }
        const userId = auth.currentUser.uid;

        if (post.postedBy === userId) return;

        const isLiked = post.likedBy?.includes(userId);
        const postRef = doc(db, 'sales', post.id);

        try {
            setAllSales((currentSales) =>
                currentSales.map((p) => {
                    if (p.id === post.id) {
                        const newLikedBy = isLiked
                            ? (p.likedBy || []).filter(id => id !== userId)
                            : [...(p.likedBy || []), userId];

                        const newLikesCount = isLiked
                            ? Math.max(0, (p.likes || 0) - 1)
                            : (p.likes || 0) + 1;

                        return { ...p, likedBy: newLikedBy, likes: newLikesCount };
                    }
                    return p;
                })
            );
            await updateDoc(postRef, {
                likedBy: isLiked ? arrayRemove(userId) : arrayUnion(userId),
                likes: isLiked ? increment(-1) : increment(1)
            });
        } catch (error) {
            Alert.alert("Error", "Could not like the post. Please try again.");
        }
    };

    const getTimeRemaining = (expiresAt: any) => {
        if (!expiresAt) return "Permanent";
        const expiry = expiresAt.seconds ? new Date(expiresAt.seconds * 1000) : new Date(expiresAt);
        if (expiry.getFullYear() > 2090) return "Permanent";

        const now = new Date();
        const diffInMins = expiry.getTime() - now.getTime();
        const diffInHrs = Math.floor(diffInMins / (1000 * 60 * 60));

        if (diffInHrs > 24) {
            return `${Math.floor(diffInHrs / 24)}d left`;
        } else if (diffInHrs > 0) {
            return `${diffInHrs}h left`;
        } else {
            return "Ending soon";
        }
    };

    const displayedResults = searchQuery.trim() === '' ? []
        : allSales.filter(sale => {
            const queryLower = searchQuery.toLowerCase();
            const titleMatch = sale.title?.toLowerCase().includes(queryLower);
            const descMatch = sale.description?.toLowerCase().includes(queryLower);

            return titleMatch || descMatch;
        });

    const renderSearchContent = () => {
        if (loading) {
            return <ActivityIndicator size="large" color="#1A3C40" style={{ marginTop: 40 }} />
        }

        return (
            <FlatList
                data={displayedResults}
                keyExtractor={(item) => item.id}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingBottom: 20 }}
                keyboardShouldPersistTaps="handled"
                keyboardDismissMode="on-drag"

                ListEmptyComponent={() => (
                    <Text style={searchstyles.emptyText}>
                        {searchQuery.length > 0 ? "No items found" : "Type something to start searching"}
                    </Text>
                )}
                renderItem={({ item }) => (
                    <Pressable
                        style={searchstyles.resultCard}
                        onPress={() => {
                            setSelectedPost(item);
                            setModalVisible(true);
                        }}
                    >
                        <Image
                            source={{ uri: item.image || (item.images && item.images[0]) }}
                            style={searchstyles.resultImage}
                        />
                        <View style={searchstyles.resultTextContainer}>
                            <Text style={searchstyles.resultTitle} numberOfLines={1}>{item.title}</Text>
                            <Text style={searchstyles.resultAddress} numberOfLines={1}>{item.address}</Text>
                            <Text style={searchstyles.resultDesc} numberOfLines={1}> {item.description}</Text>
                        </View>
                    </Pressable>
                )}
            />
        );
    };

    return (
        <View style={[searchstyles.container, { backgroundColor: headerColor }]}>
            <StatusBar style='dark' backgroundColor={headerColor} />

            <View style={searchstyles.header}>
                <Pressable onPress={() => router.back()} style={searchstyles.backbutton}>
                    <Ionicons name="arrow-back" size={24} color="#1A3C40" />
                </Pressable>

                <View style={searchstyles.searchInputContainer}>
                    <Ionicons name="search" size={20} color="#666" style={{ marginRight: 8 }} />
                    <TextInput
                        style={searchstyles.input}
                        placeholder="Search for items, categories..."
                        placeholderTextColor="#888888"
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                        autoFocus={true}
                        returnKeyType="search"
                    />
                    {searchQuery.length > 0 && (
                        <Pressable onPress={() => setSearchQuery('')}>
                            <Ionicons name='close-circle' size={20} color="#999" />
                        </Pressable>
                    )}
                </View>
            </View>

            <View style={[searchstyles.body, { backgroundColor: bodyColor }]}>
                {renderSearchContent()}
            </View>

            <PostDetailModal
                visible={modalVisible}
                post={selectedPost}
                onClose={() => {
                    setModalVisible(false);
                    setSelectedPost(null);
                }}
                auth={auth}
                router={router}
                handleLike={handleLike}
                handleSave={handleSave}
                getTimeRemaining={getTimeRemaining}
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

const searchstyles = StyleSheet.create({
    container: { flex: 1, backgroundColor: 'white', paddingTop: 35 },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingLeft: 10,
        paddingRight: 10,
        paddingBottom: 10,
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
    },
    backbutton: { padding: 5 },
    searchInputContainer: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 15,
        height: 45,
        borderRadius: 15,
        backgroundColor: '#fcfcfc',
    },
    input: { flex: 1, fontSize: 14, color: '#000' },
    body: { flex: 1, paddingHorizontal: 15, paddingTop: 10 },
    emptyText: { color: "#666", marginTop: 40, fontSize: 16, textAlign: 'center' },
    resultCard: {
        flexDirection: 'row',
        backgroundColor: "#efeff0",
        borderRadius: 10,
        padding: 10,
        marginBottom: 10, borderWidth: 1, borderColor: '#d4d4d4',
    },
    resultImage: {
        width: 70,
        height: 70,
        borderRadius: 8,
        backgroundColor: '#ddd',
        marginRight: 12,
    },
    resultTextContainer: {
        flex: 1, justifyContent: 'center',
    },
    resultTitle: {
        fontSize: 16, fontWeight: 'bold', color: "black", marginBottom: 2
    },
    resultAddress: {
        fontSize: 12, color: "#386085", marginBottom: 4,
    },
    resultDesc: {
        fontSize: 13, color: "#666"
    },
});