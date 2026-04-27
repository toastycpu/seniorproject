import { View, Text, StyleSheet, ActivityIndicator, Linking, Platform, Alert } from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import { useLocalSearchParams, useFocusEffect, router } from 'expo-router';
import { useState, useCallback } from 'react';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db, auth } from '../../firebase/firebaseConfig';

export default function MapScreen() {
    const [sales, setSales] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const { selectedId, lat, lng } = useLocalSearchParams();

    const handleGetDirections = (latitude: number, longitude: number, title: string) => {
        if (Platform.OS === 'android') return; 

        const safeTitle = title ? title : 'Destination';
        const encodedTitle = encodeURIComponent(safeTitle);
        const url = `https://maps.apple.com/?daddr=${latitude},${longitude}&q=${encodedTitle}`;

        Linking.canOpenURL(url)
            .then(supported => {
                if (supported) {
                    Linking.openURL(url);
                } else {
                    console.warn("Phone does not support opening this map link.");
                }
            })
            .catch(err => console.error("Error opening map link:", err));
    };

    useFocusEffect(
        useCallback(() => {
            const fetchSales = async () => {
                setLoading(true);
                try {
                    const now = new Date();
                    const salesRef = collection(db, 'sales');
                    const q = query(salesRef, where('expiresAt', '>', now));

                    const querySnapshot = await getDocs(q);
                    const fetchedSales = querySnapshot.docs.map(doc => ({
                        id: doc.id,
                        ...doc.data()
                    }));
                    setSales(fetchedSales);
                } catch (error) {
                    console.error( "error fetching map pins:", error);
                } finally {
                    setLoading(false);
                }
            };
        fetchSales();
    }, [])
);

    if (loading) {
        return (
            <View style={[mapstyle.container, {justifyContent: 'center', alignItems: 'center' }]}>
                <ActivityIndicator size="large" color="#1A3C40" />
                <Text style={{marginTop: 10}}>Loading map...</Text>
            </View>
        );
    }

    const currentUserId = auth.currentUser?.uid;
    return (
        <View style={mapstyle.container}>
            <MapView
                style={mapstyle.map}
                initialRegion={{
                    latitude: lat ? parseFloat(lat as string) : 37.1305,
                    longitude: lng ? parseFloat(lng as string) : -113.6644,
                    latitudeDelta: lat ? 0.01 : 0.0922,
                    longitudeDelta: lng ? 0.01 : 0.0421,
                }}
            >
                {sales.map((sale) => {
                    if (!sale.latitude || !sale.longitude) return null;

                    let markerColor = 'teal'; //default color
                    if (sale.id === selectedId) {
                        markerColor = 'yellow'; //link addr from homefeed
                    } else if (currentUserId && sale.postedBy === currentUserId) {
                        markerColor = 'red' //user own post
                    }

                    return (
                        <Marker
                            key={sale.id}
                            coordinate={{latitude: sale.latitude, longitude: sale.longitude}}
                            title={sale.title}
                            description={sale.description}
                            pinColor={markerColor}
                            onCalloutPress={() => handleGetDirections(sale.latitude, sale.longitude, sale.title)}
                        />
                    )

                })}
            </MapView>
        </View>
    )
}

const mapstyle = StyleSheet.create ({
    container: {
        flex: 1,
        backgroundColor: 'white'
    },
    map: {
        width: '100%',
        height:'100%',
    }
});

