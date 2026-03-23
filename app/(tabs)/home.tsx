import {View, Text, Image, StyleSheet, FlatList, Pressable, Dimensions, RefreshControl} from 'react-native';
import {useState, useCallback} from 'react';
import {collection, getDocs, query, orderBy, where} from 'firebase/firestore';
import {db} from '../../firebase/firebaseConfig';
import { Ionicons } from '@expo/vector-icons';
import {useRouter, useFocusEffect} from 'expo-router';

const { width: screenWidth } = Dimensions.get('window');
const imageWidth = screenWidth - 40;

interface Sale {
    id: string;
    title: string;
    address: string;
    description: string;
    categories: string[];
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
}

export default function HomeScreen(){
    const [sales, setSales]= useState<Sale[]>([]);
    const [refreshing, setRefreshing] = useState(false);
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

    useFocusEffect(
        useCallback(() => {
            fetchSales();
        }, [])
    );


    const getTimeRemaining =(expiresAt: any) =>{
        if (!expiresAt) return "Permanent";

        const expiry = expiresAt.seconds ? new Date(expiresAt.seconds * 1000) : new Date(expiresAt);
        const now = new Date();
        const diffInMins = expiry.getTime() - now.getTime();
        const diffInHrs = Math.floor(diffInMins / (1000 *60 *60));

        if (diffInHrs > 24){
            return `${Math.floor(diffInHrs / 24)}d left`;
        } else if (diffInHrs > 0) {
            return `${diffInHrs}h left`;
        }else {
            return "Ending soon";
        }
    };

    return (
        <View style={homestyle.container}>
            <View style={homestyle.headercontainer}>
                <View style={{width: 40}}/>
                <Text style={homestyle.header}>ReFind</Text>
                <Pressable style={homestyle.button} onPress={() => router.push('/create')}
                >
                    <Ionicons name="add" size={24} color="white" />
                </Pressable>
            </View>   
            <Pressable
                onPress={() => router.push('/search')}
                style={homestyle.fakeSearchBar}
            >
                <Ionicons name="search" size={20} color="#666" style={{ marginRight: 8 }} />

            </Pressable>

            <FlatList
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#1A3C40" />
                }
                data={sales}
                keyExtractor={(item) => item.id}
                showsVerticalScrollIndicator={false}
                renderItem={({item}) => (
                    <View style={homestyle.card}>
                        <View style={homestyle.cardHeader}>
                            {item.authorAvatar ? (
                                    <Image 
                                        source={{ uri: item.authorAvatar }} 
                                        style={homestyle.avatar} 
                                    />
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
                                <Text style={homestyle.date}>{item.postedDate} | {item.startTime}</Text>
                            </View>
                        </View>

                        {item.images && item.images.length > 0 ? (
                            <FlatList 
                                data={item.images}
                                horizontal
                                pagingEnabled
                                showsHorizontalScrollIndicator={false}
                                keyExtractor={(imgUri, index) => index.toString()}
                                renderItem={({ item: imgUri }) => (
                                    <Image 
                                        source={{ uri: imgUri }} 
                                        style={[homestyle.image, { width: imageWidth }]} 
                                    />
                                )}
                            />
                        ) : (
                            <Image 
                                source={{ uri: item.image }} 
                                style={[homestyle.image, { width: imageWidth }]} 
                            />
                        )}

                        <View style={homestyle.cardContent}>
                            <View style={homestyle.spacebetween}>
                                <Text style={homestyle.title}>{item.title}</Text>
                                <Text style={homestyle.categoryTag}>
                                    {item.categories && item.categories[0] ? item.categories[0] : 'Sale'}
                                </Text>
                            </View>

                            <View style={{flexDirection: 'row', alignItems: 'center', marginBottom: 8}}>
                                <Pressable
                                    onPress={() => {
                                        router.push({
                                            pathname: '/(tabs)/map',
                                            params: {
                                                selectedId: item.id,
                                                lat: item.latitude?.toString(),
                                                lng: item.longitude?.toString(),
                                            }
                                        });
                                    }}
                                    style={{paddingRight: 8, paddingVertical: 4}}
                                >
                                    <Ionicons name="navigate-outline" size={20} color="#1627ae" style={{marginRight: 4}} />
                                </Pressable>
                                <Text style={[homestyle.address, {marginBottom: 0, flex: 1}]}>
                                    {item.address}
                                </Text>
                            </View>

                                <Text style={homestyle.description} >
                                    {item.description}
                                </Text>


                                <View style={homestyle.actionRow}>
                                    <Pressable style={homestyle.actionButton}>
                                        <Ionicons name="heart-outline" size={20} color="#1A3C40" />
                                        <Text style={homestyle.actionText}>{item.likes || 0} Likes</Text>
                                    </Pressable>

                                    <Pressable 
                                        onPress={() => router.push(`/comments?postId=${item.id}`)} 
                                        style={homestyle.actionButton}
                                    >
                                        <Ionicons name="chatbubble-outline" size={20} color="#1A3C40" />
                                        <Text style={homestyle.actionText}>Comment</Text>
                                    </Pressable>
                                    
                                    <Pressable style={homestyle.actionButton}>
                                        <Ionicons name="bookmark-outline" size={20} color="#1A3C40" />
                                        <Text style={homestyle.actionText}>Save</Text>
                                    </Pressable>
                            </View>
                        </View>
                    </View>
                )}
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
        overflow: 'hidden',
        elevation: 3,
        shadowColor: '#000',
        shadowOffset: {width: 0, height: 2},
        shadowOpacity: 0.1,
        shadowRadius: 4,
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
    categoryTag:{
        backgroundColor: '#e0f2f1', color:'#1A3C40', paddingHorizontal: 8,
        borderRadius: 4, fontSize: 12, textAlignVertical: 'center',
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
})