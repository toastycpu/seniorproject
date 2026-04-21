import { View, Text, Image, StyleSheet, FlatList, Pressable, Dimensions, RefreshControl, Alert } from 'react-native';
import { useState, useCallback } from 'react';
import { collection, getDocs, query, orderBy, where, doc, updateDoc, arrayUnion, arrayRemove, increment } from 'firebase/firestore';
import { db, auth } from '../../firebase/firebaseConfig';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useFocusEffect } from 'expo-router';
import ImageViewing from 'react-native-image-viewing';

const { width: screenWidth } = Dimensions.get('window');
const imageWidth = screenWidth - 40;

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

export default function HomeScreen(){
    const [sales, setSales]= useState<Sale[]>([]);
    const [refreshing, setRefreshing] = useState(false);
    
    const [viewerImages, setViewerImages] = useState<{uri: string}[]>([]);
    const [isViewerVisible, setIsViewerVisible] = useState(false);
    const [currentImageIndex, setCurrentImageIndex] = useState(0);
    
    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        await fetchSales();
        setRefreshing(false);
    }, []);

    const router = useRouter();

    const fetchSales = async() => {
        try {
            const now = new Date();
            const salesRef = collection(db, 'sales');
            const q = query(salesRef, where('expiresAt', '>', now), orderBy('createdAt', 'asc'));
            const querySnapshot = await getDocs(q);
            
            const salesData: Sale[] = querySnapshot.docs.map((doc)=> ({
                id: doc.id, 
                ...doc.data(),
            })) as Sale[];

            setSales(salesData); 
        } catch (error) {
            console.log("Error fetching sales:", error);
        }
    };

    const handleSave = async (post:Sale) => {
        if (!auth.currentUser) {
            Alert.alert("Not logged in", "You must be logged in to save post");
            return;
        }
        const userId = auth.currentUser.uid;
        const isSaved = post.savedBy?.includes(userId);
        const postRef = doc(db, 'sales', post.id);

        try {
            setSales((currentSales) =>
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
            console.log("Error toggling save:", error);
            Alert.alert("Error", "Could not save the post. Please try again.");
        }
    };

    const handleLike = async (post: Sale) => {
        if (!auth.currentUser) {
            Alert.alert("Not logged in", "You must be logged in to like a post.");
            return;
        }
        const userId = auth.currentUser.uid;

        if (post.postedBy === userId) {
            return;
        }

        const isLiked = post.likedBy?.includes(userId);
        const postRef = doc(db, 'sales', post.id);

        try {
            setSales((currentSales) =>
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
            console.log("Error toggling like:", error);
            Alert.alert("Error", "Could not like the post. Please try again.");
        }
    };

    useFocusEffect(
        useCallback(() => {
            fetchSales();
        }, [])
    );

    const getTimeRemaining =(expiresAt: any) =>{
        if (!expiresAt) return "Permanent";

        const expiry = expiresAt.seconds ? new Date(expiresAt.seconds * 1000) : new Date(expiresAt);

        if (expiry.getFullYear() > 2090) {
            return "Permanent";
        }

        const now = new Date();
        const diffInMins = expiry.getTime() - now.getTime();
        const diffInHrs = Math.floor(diffInMins / (1000 *60 *60));

        if (diffInHrs > 24){
            return `${Math.floor(diffInHrs / 24)}d left`;
        } else if (diffInHrs > 0) {
            return `${diffInHrs}h left`;
        } else {
            return "Ending soon";
        }
    };

    return (
        <View style={homestyle.container}>
            <View style={homestyle.headercontainer}>
                <View style={{width: 40}}/>
                <Text style={homestyle.header}>ReFind</Text>
                <Pressable style={homestyle.button} onPress={() => router.push('/create')}>
                    <Ionicons name="add" size={24} color="white" />
                </Pressable>
            </View>   
            <Pressable onPress={() => router.push('/search')} style={homestyle.fakeSearchBar}>
                <Ionicons name="search" size={20} color="#666" style={{ marginRight: 8 }} />
            </Pressable>

            <FlatList
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#1A3C40" />
                }
                data={sales}
                keyExtractor={(item) => item.id}
                showsVerticalScrollIndicator={false}
                renderItem={({item}) => {
                    const isSavedByCurrentUser = item.savedBy?.includes(auth.currentUser?.uid || '');
                    const isLikedByCurrentUser = item.likedBy?.includes(auth.currentUser?.uid || '');
                    
                    const formattedImages = item.images && item.images.length > 0 
                        ? item.images.map(img => ({ uri: img })) 
                        : item.image ? [{ uri: item.image }] : [];


                    const hasTime = item.startTime && item.endTime;
                    const hasDays = Array.isArray(item.daysOpen) && item.daysOpen.length > 0;
                    const isYardSaleEvent = hasTime || hasDays;

                    const formatPostedDate = (dateVal: any) => {
                        if (!dateVal) return '';

                        if (dateVal.seconds) {
                            return new Date(dateVal.seconds * 1000).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
                        }
                        const dateObj = new Date(dateVal);
                        if (!isNaN(dateObj.getTime())) {
                            return dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
                        }
                        return dateVal;
                    };

                    return (
                        <View style={homestyle.card}>
                            <View style={homestyle.cardHeader}>
                                {item.authorAvatar ? (
                                        <Image source={{ uri: item.authorAvatar }} style={homestyle.avatar} />
                                    ) : (
                                        <View style={[homestyle.avatar, { justifyContent: 'center', alignItems: 'center', backgroundColor: '#ccc' }]}>
                                            <Ionicons name="person" size={20} color="white" />
                                        </View>
                                    )}
                                <View style={{flex:1}}>
                                    <View style={homestyle.spacebetween}>
                                        <Text style={homestyle.username}>{item.authorName || 'Anonymous User'}</Text>
                                        <View style={homestyle.timerBadge}>
                                            <Ionicons name="time-outline" size={12} color="#1A3C40" />
                                            <Text style={homestyle.timerText}>{getTimeRemaining(item.expiresAt)}</Text>
                                        </View>
                                    </View>
                                    <Text style={homestyle.date}>{formatPostedDate(item.postedDate)}</Text>
                                </View>
                            </View>

                            {item.images && item.images.length > 0 ? (
                                <FlatList 
                                    data={item.images}
                                    horizontal
                                    pagingEnabled
                                    showsHorizontalScrollIndicator={false}
                                    keyExtractor={(imgUri, index) => index.toString()}
                                    renderItem={({ item: imgUri, index }) => (
                                        <Pressable onPress={() => {
                                            setViewerImages(formattedImages);
                                            setCurrentImageIndex(index);
                                            setIsViewerVisible(true);
                                        }}>
                                            <Image source={{ uri: imgUri }} style={[homestyle.image, { width: imageWidth }]} />
                                        </Pressable>
                                    )}
                                />
                            ) : item.image ? (
                                <Pressable onPress={() => {
                                    setViewerImages(formattedImages);
                                    setCurrentImageIndex(0);
                                    setIsViewerVisible(true);
                                }}>
                                    <Image source={{ uri: item.image! }} style={[homestyle.image, { width: imageWidth }]} />
                                </Pressable>
                            ) : null}

                            <View style={homestyle.cardContent}>
                                {/* Adjusted marginBottom here to keep spacing even */}
                                <Text style={[homestyle.title, { marginBottom: 4, fontSize: 18, fontWeight: 'bold' }]}>
                                    {item.title}
                                </Text>
                                
                                {/* --- NEW PRICE DISPLAY BLOCK --- */}
                                <View style={{ marginBottom: 12 }}>
                                    {item.isOwnPrice ? (
                                        <Text style={{ fontSize: 16, fontWeight: 'bold', color: '#1A3C40' }}>
                                            Name your price
                                        </Text>
                                    ) : item.price ? (
                                        <Text style={{ fontSize: 16, fontWeight: 'bold', color: '#1A3C40' }}>
                                            ${item.price}
                                        </Text>
                                    ) : null}
                                </View>

                                
                                {isYardSaleEvent && (
                                    <View style={{ backgroundColor: '#f4f6f6', padding: 10, borderRadius: 8, marginBottom: 12 }}>
                                        {hasDays && (
                                            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: hasTime ? 6 : 0 }}>
                                                <Ionicons name="calendar-outline" size={16} color="#1A3C40" style={{ marginRight: 6 }} />
                                                <Text style={{ fontSize: 14, color: '#1A3C40', fontWeight: 'bold' }}>
                                                    Days: <Text style={{ color: '#555', fontWeight: 'normal' }}>{item.daysOpen?.join(', ')}</Text>
                                                </Text>
                                            </View>
                                        )}
                                        {hasTime && (
                                            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                                <Ionicons name="time-outline" size={16} color="#1A3C40" style={{ marginRight: 6 }} />
                                                <Text style={{ fontSize: 14, color: '#1A3C40', fontWeight: 'bold' }}>
                                                    Time: <Text style={{ color: '#555', fontWeight: 'normal' }}>{item.startTime} - {item.endTime}</Text>
                                                </Text>
                                            </View>
                                        )}
                                    </View>
                                )}

                                {item.address && (
                                    <View style={{flexDirection: 'row', alignItems: 'center', marginBottom: 8}}>
                                        <Pressable
                                            onPress={() => {
                                                router.push({
                                                    pathname: '/(tabs)/map',
                                                    params: { selectedId: item.id, lat: item.latitude?.toString(), lng: item.longitude?.toString() }
                                                });
                                            }}
                                            style={{paddingRight: 8, paddingVertical: 4}}
                                        >
                                            <Ionicons name="navigate-circle" size={24} color="#1A3C40" />
                                        </Pressable>
                                        <Text style={[homestyle.address, {marginBottom: 0, flex: 1, color: '#555'}]}>
                                            {item.address}
                                        </Text>
                                    </View>
                                )}

                                <Text style={[homestyle.description, { marginBottom: 16 }]}>
                                    {item.description}
                                </Text>

                                <View style={homestyle.actionRow}>
                                    <Pressable style={homestyle.actionButton} onPress={() => handleLike(item)}>
                                        <Ionicons 
                                            name={isLikedByCurrentUser ? "heart" : "heart-outline"} 
                                            size={22} 
                                            color={isLikedByCurrentUser ? "#e74c3c" : "#1A3C40"} 
                                        />
                                        <Text style={[homestyle.actionText, isLikedByCurrentUser && { color: '#e74c3c', fontWeight: 'bold' }]}>
                                            {item.likes || 0}
                                        </Text>
                                    </Pressable>

                                    <Pressable onPress={() => router.push(`/comments?postId=${item.id}`)} style={homestyle.actionButton}>
                                        <Ionicons name="chatbubble-outline" size={20} color="#1A3C40" />
                                        <Text style={homestyle.actionText}>
                                            {item.commentsCount || 0}
                                        </Text>
                                    </Pressable>

                                    <Pressable style={homestyle.actionButton} onPress={() => handleSave(item)}>
                                        <Ionicons 
                                            name={isSavedByCurrentUser ? "bookmark" : "bookmark-outline"} 
                                            size={20} 
                                            color={isSavedByCurrentUser ? "#1A3C40" : "#555"}
                                        />
                                        <Text style={[homestyle.actionText, isSavedByCurrentUser && {color: '#1A3C40', fontWeight: 'bold' }]}>
                                            {isSavedByCurrentUser ? "Saved" : "Save"}
                                        </Text>
                                    </Pressable>
                                </View>
                            </View>
                        </View> 
                    );
                }}
            />

            <ImageViewing
                images={viewerImages}
                imageIndex={currentImageIndex}
                visible={isViewerVisible}
                onRequestClose={() => setIsViewerVisible(false)}
                swipeToCloseEnabled={true}
                doubleTapToZoomEnabled={true}
            />
        </View>
    );
}

const homestyle = StyleSheet.create({
    container: { flex: 1, justifyContent: 'center', padding: 20},
    headercontainer:{
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 10,
        marginTop: 20,
        marginBottom: 10,
    },
    header: {
        fontSize: 35,
        fontWeight: 'bold',
        color: '#1A3C40'
    },
    button: {
        backgroundColor: '#485b5d', 
        width: 40, height: 40, 
        borderRadius: 20, 
        justifyContent: 'center', 
        alignItems: 'center'
    },
    card: {
        backgroundColor: 'white',
        borderRadius: 10,
        marginBottom: 15,
        elevation: 4,
        shadowColor: '#000',
        shadowOffset: {width: 0, height: 5},
        shadowOpacity: 0.15,
        shadowRadius: 5,
    },
    cardHeader: {
        flexDirection: 'row',
        padding: 12,
        alignItems: 'center',
    },
    avatar: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: "#ddd",
        marginRight: 10,
    },
    username: {fontWeight: 'bold', fontSize: 14, color: 'black'},
    date: { fontSize: 12, color: "black"},
    image: {
        resizeMode: 'cover',
        height: 200,
        backgroundColor: '#a19f9f',
    },
    cardContent: {
        padding: 12,
    },
    spacebetween: {
        flexDirection: 'row', justifyContent: 'space-between', marginBottom: 5,
    },
    title: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#1a2640'
    },
    address: {
        fontWeight: '400',
        fontSize: 16,
        color: 'black',
        marginBottom: 8,
        lineHeight: 20,
    },
    description: {
        fontSize: 14,
        color: '#666',
        marginBottom: 12,
    },
    actionRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: 15,
        paddingTop: 15,
        borderTopWidth: 1,
        borderTopColor: '#eee',
    },
    actionButton: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    actionText: {
        marginLeft: 6,
        fontSize: 14,
        color: '#555',
        fontWeight: '500'
    },
    timerBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#E8F1F2',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
    },
    timerText: {
        fontSize: 10,
        fontWeight: 'bold',
        color: '#1A3C40',
        marginLeft: 4,
    },
    fakeSearchBar: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#d0d0d0',
        marginHorizontal: 20,
        marginBottom: 15,
        paddingHorizontal: 15,
        paddingVertical: 12,
        borderRadius: 25,
    },
    modalContainer: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.9)', justifyContent: 'center', alignItems: 'center' },
    closeButton: { position: 'absolute', top: 50, right: 20, zIndex: 1 },
    fullScreenImage: { width: '100%', height: '80%' }
});