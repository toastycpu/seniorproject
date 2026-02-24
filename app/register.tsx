import {
  View, Text, TextInput, Pressable, StyleSheet,
  ScrollView, KeyboardAvoidingView, Platform} from 'react-native';
import { useState } from 'react';
import {createUserWithEmailAndPassword, updateProfile} from 'firebase/auth';
import {auth} from '../firebase/firebaseConfig';
import {router} from 'expo-router';
import {Ionicons} from '@expo/vector-icons';

export default function RegisterScreen() {
  const [username, setUsername] =useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isPasswordVisible, setIsPasswordVisible] = useState(false)

  const handleRegister = async () => {
    if (!username || !email || !password){
      alert('Please fill out all the fields')
      return;
    }

    try{
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      await updateProfile(userCredential.user,{
        displayName: username,
      });
      router.replace('/home');
    }catch (error: any){
      alert(error.message);
    }
  };

  return (
    <View style={registerStyles.mainContainer}>
      <KeyboardAvoidingView 
        style={{ flex: 1, backgroundColor: '#eeeeee'}} 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          style={{backgroundColor: '#eeeeee'}}
          contentContainerStyle={registerStyles.scrollContainer} 
          keyboardShouldPersistTaps="handled"
        >
        <View style={registerStyles.container}>
          <Text style={registerStyles.title}>Create Account</Text>
          
          <TextInput 
            placeholder="Username" 
            style={registerStyles.input} 
            onChangeText={setUsername}
            autoCapitalize='none'  
          />

          <TextInput 
            placeholder="Email"
            style={registerStyles.input}
            autoCapitalize='none'
            onChangeText={setEmail}
          />

          <View style={registerStyles.passwordContainer}>
            <TextInput
              placeholder="Password"
              secureTextEntry={!isPasswordVisible}
              style={registerStyles.passwordInput}
              onChangeText={setPassword}
              autoCapitalize='none'
              value={password}
            />

            <Pressable
              onPress={() => setIsPasswordVisible(!isPasswordVisible)}
              style={registerStyles.eye}
            >
              <Ionicons
                name={isPasswordVisible ? "eye-off": "eye"}
                size={24}
                color="gray"
              />
            </Pressable>
          </View>

          <Pressable style={registerStyles.button} onPress={handleRegister}>
            <Text style={registerStyles.linktext}>Sign up</Text>
          </Pressable>

          <Pressable onPress={() => router.back()}>
            <Text style={registerStyles.back}>
              <Ionicons name="arrow-back" size={20} color="#1A3C40" />Back to Login</Text>
          </Pressable>
        </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const registerStyles = StyleSheet.create({
  mainContainer: {flex: 1, backgroundColor: "#eeeeee"},
  scrollContainer: {flexGrow: 1, justifyContent: 'center'},
  container: {padding: 20, width: '100%'},
  title: { fontSize: 30, textAlign: 'center', fontWeight: 'bold', marginBottom: 25, color:'#666859'},
  input: {
    borderWidth: 1,
    padding: 15,
    marginBottom: 10,
    borderRadius: 10,
    backgroundColor: 'white',
  },
  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'black',
    borderRadius: 10,
    backgroundColor: 'white',
    marginBottom: 10,
    paddingHorizontal: 10,
  },
  passwordInput: {
    flex: 1,
    paddingVertical: 15,
    paddingRight: 10,
  },
  eye: {padding: 5},
  button: {backgroundColor: '#666859', borderRadius: 10, padding: 10, marginBottom: 10},
  linktext: { color: 'white', fontWeight: 'bold', textAlign: 'center', fontSize: 20},
  back: {color: '#1A3C40', fontWeight: 'bold', textAlign: 'center', paddingTop: 20, fontSize: 19},
})