import {View, Text, Pressable, StyleSheet, codegenNativeCommands} from 'react-native';
import {signOut} from 'firebase/auth';
import {auth} from '../firebase/firebaseConfig';
import {router} from 'expo-router';


export default function HomeScreen(){
    const handleLogout = async () => {
        await signOut(auth);
        router.replace('/');
    };

    return (
        <View style={logoutstyle.container}>
            <Text style={logoutstyle.text}>Welcome to Refind</Text>

            <Pressable style={logoutstyle.button} onPress={handleLogout}>
                <Text style={logoutstyle.text}>Logout</Text>
            </Pressable>
        </View>
    );
}

const logoutstyle = StyleSheet.create({
    container: { flex: 1, justifyContent: 'center', padding: 20 },
    title: { fontSize: 26, textAlign: 'center', paddingBottom: 60},
    input: {
        borderWidth: 1,
        padding: 10,
        marginBottom: 10,
        borderRadius: 5,
    },
    button: {
        backgroundColor: '#c5cac8', 
        padding: 10, 
        marginBottom: 10, 
        borderRadius: 10, 
        marginHorizontal: 60},
    text: {
        color: 'black',
        fontWeight: 'bold',
        fontSize: 14,
        textAlign: 'center',
    }
})