import {View, Text, StyleSheet, ActivityIndicator} from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import { useLocalSearchParams } from 'expo-router';
import { useState, useEffect } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../../firebase/firebaseConfig';

export default function MapScreen() {
    const [sales, setSales] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const { selectedId, lat, lng } = useLocalSearchParams()

    useEffect(() => {
        const fetchSales = async () => {
            try {
                const querySnapshot = await getDocs(collection(db, 'sales'));
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
    }, []);

    if (loading) {
        return (
            <View style={[mapstyle.container, {justifyContent: 'center', alignItems: 'center' }]}>
                <ActivityIndicator size="large" color="#1A3C40" />
                <Text style={{marginTop: 10}}>Loading map...</Text>
            </View>
        );
    }
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

                    return (
                        <Marker
                            key={sale.id}
                            coordinate={{latitude: sale.latitude, longitude: sale.longitude}}
                            title={sale.title}
                            description={sale.description}
                            pinColor={sale.id === selectedId ?'red' : '#1A3C40'}
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

