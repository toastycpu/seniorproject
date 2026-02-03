//login page
import {
  View, Text, TextInput, Pressable, StyleSheet,
  ScrollView, KeyboardAvoidingView, Platform} from 'react-native';
import { signInWithEmailAndPassword } from 'firebase/auth';
import {auth} from '../firebase/firebaseConfig';
import {router} from 'expo-router';
import {useState} from 'react';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  
  const handleLogin = async () => {
    try {
      await signInWithEmailAndPassword(auth, email, password);
      router.replace('/home');
    }catch (error:any) {
      alert(error.message)
    }
  };

  return (
    <View style={logstyle.mainContainer}>
    <KeyboardAvoidingView 
      style={{ flex: 1, backgroundColor: '#eeeeee'}} 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        style={{backgroundColor: '#eeeeee'}}
        contentContainerStyle={logstyle.scrollContainer} 
        keyboardShouldPersistTaps="handled"
      >
        <View style={logstyle.container}>
          <Text style={logstyle.title}>ReFind</Text>
          <Text style={logstyle.subtitle}>Your next Treasure</Text>

          <TextInput
            placeholder="Email"
            style={logstyle.input}
            onChangeText={setEmail}
            value={email}
            autoCapitalize="none"
          />

          <TextInput
            placeholder="Password"
            style={logstyle.input}
            onChangeText={setPassword}
            value={password}
            secureTextEntry
          />

          <Pressable style={logstyle.button} onPress={handleLogin}>
            <Text style={logstyle.linktext}>Login</Text>
          </Pressable>

          <Pressable onPress={() => router.push('/register')}>
            <Text style={logstyle.newaccount}>Create an Account</Text>
          </Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
    </View>
  );
}

const logstyle = StyleSheet.create({
  mainContainer: {
    flex: 1,
    backgroundColor: "#eeeeee",
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  container: {  
    padding: 20,
    width: '100%',},
  title: { fontSize: 50, textAlign: 'center', fontWeight: 'bold', color:'#666859'},
  subtitle:{ fontSize: 18, textAlign: 'center', marginBottom: 25, marginLeft: 10},
  input: {
    backgroundColor: 'white',
    borderWidth: 1,
    padding: 15,
    marginBottom: 10,
    borderRadius: 10,
  },
  button: {backgroundColor: '#666859', borderRadius: 10, padding: 10, marginBottom: 10},
  linktext: {color: 'white', fontWeight: 'bold', textAlign: 'center', fontSize: 14},
  newaccount: {color: '#1A3C40', fontWeight: 'bold', textAlign: 'center', paddingTop: 20, fontSize: 20}
});

