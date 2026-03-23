import { View, Text, TextInput, StyleSheet, Pressable, FlatList, ActivityIndicator, Image } from 'react-native';
import { useState, useEffect} from 'react';
import { useRouter } from 'expo-router';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { Ionicons } from '@expo/vector-icons';
import { db } from '../firebase/firebaseConfig';
import { StatusBar } from 'expo-status-bar';


export default function SearchScreen() {
    const router = useRouter();
    const [searchQuery, setSearchQuery] = useState('');
    const [allSales, setAllSales] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const headerColor = '#E8F1F2'; 
    const bodyColor = '#FFFFFF';

    useEffect(() => {
        const fetchAllActiveSales = async() =>{
            try {
                const now = new Date();
                const salesRef = collection(db, 'sales');
                const q = query(salesRef, where ('expiresAt', '>', now));
                const querySnapshot = await getDocs(q);
                const fetchedSales = querySnapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                }));
                setAllSales(fetchedSales);
            } catch (error){
                console.error("error fetching for search:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchAllActiveSales();
    }, []);

    const displayedResults = searchQuery.trim() === '' ? []
        : allSales.filter(sale => {
            const queryLower = searchQuery.toLowerCase();
            const titleMatch = sale.title?.toLowerCase().includes(queryLower);
            const descMatch = sale.description?.toLowerCase().includes(queryLower);

            return titleMatch || descMatch;
        });

    const renderSearchContent = () => {
        if (loading) {
            return <ActivityIndicator size="large" color="#1A3C40" style={{marginTop: 40 }} />
        }

        return (
            <FlatList
                data={displayedResults}
                keyExtractor={(item) => item.id}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{paddingBottom: 20}}
                ListEmptyComponent={() => (
                    <Text style={searchstyles.emptyText}>
                        {searchQuery.length > 0 ? "No items found" : "Type something to start searching"}
                    </Text>
                )}
                renderItem={({item}) => (
                    <Pressable
                        style={searchstyles.resultCard}
                        onPress ={() => {
                            router.push({
                                pathname: '/(tabs)/map',
                                params: {
                                    selectedId: item.id,
                                    lat: item.latitude  ? item.latitude.toString(): "",
                                    lng: item.longitude ? item.longitude.toString(): "",
                                }
                            });
                        }}
                    >
                        <Image
                            source={{ uri: item.image || (item.images && item.images[0])}}
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
                    <Ionicons name="search" size={20} color="#666" style={{marginRight: 8}} />
                    <TextInput
                        style={searchstyles.input}
                        placeholder="Search for items, categories..."
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

        </View>
    );
}

const searchstyles = StyleSheet.create({
    container: {flex:1, backgroundColor: 'white', paddingTop: 35},
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingLeft:10,
        paddingRight:10,
        paddingBottom: 10,
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
    },
    backbutton: {padding: 5},
    searchInputContainer:{
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 15,
        height: 45,
        borderRadius: 15,
        backgroundColor: '#c0c0c0',

    },
    input: { flex: 1, fontSize: 14, color: '#000'},

    body: { flex: 1, paddingHorizontal: 15, paddingTop: 10},
    emptyText: {color: "#666", marginTop: 40, fontSize: 16, textAlign: 'center'},

    resultCard: {
        flexDirection: 'row',
        backgroundColor: "white",
        borderRadius: 10,
        padding: 10,
        marginBottom: 10, borderWidth: 1, borderColor: '#eee',
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
        fontSize: 16, fontWeight: 'bold', color: "#1a2640", marginBottom: 2
    },
    resultAddress: {
        fontSize: 12, color: "#294560", marginBottom: 4,
    },
    resultDesc: {
        fontSize: 13, color: "#666"
    },
});