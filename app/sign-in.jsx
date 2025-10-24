import React,{useState} from 'react';
import {Platform,KeyboardAvoidingView, View} from 'react-native';
import {Button, HelperText, Text, TextInput, useTheme} from 'react-native-paper';
import{LinearGradient} from 'expo-linear-gradient';
import { router } from 'expo-router';
import { BlurView } from 'expo-blur';




const onLogin =()=>{
    setLoading(true);
    setTimeout(() => {
        setLoading(false);
        router.replace('./home');//De test
    },500)
};


export default function SignIn() {
    const theme = useTheme();
    const [email, setEmail] = useState('');
    const emailOK=/.+@.+\..+/.test(email);

    const [pass,setPass]=useState('');
    const[show,setShow]=useState(false);
    const passOK=pass.length>=6;


    const [loading,setLoading]=useState(false);
    const canSubmit=emailOK&&passOK&&!loading;
    return (

       <KeyboardAvoidingView style={{flex:1,backgroundColor: theme.colors.background}}
                             //Reminder pentru mine ! Linia de cod de aici specifica pentru utilizatorii de IOS behaviorul pentru containerul de mutare
           //Platform este din react native
                             behavior={Platform.OS === 'ios' ? 'padding' : undefined}
       >

           <LinearGradient
               colors={['#234458', '#0E0F11']}
               start={{ x: 0.2, y: 0 }}
               end={{ x: 1, y: 1 }}
               style={{ flex: 1 }}
           >

               {/* Forme decorative */}
               <View style={{
                   position: 'absolute', top: -30, left: -40, width: 300, height: 300,
                   borderRadius: 180, backgroundColor: 'rgba(59,130,246,0.18)',borderWidth: 1,borderColor: 'rgba(255, 255, 255, 0.25)'
                   ,
               }} />
               <View style={{
                   position: 'absolute', bottom: 190, right: -30, width: 180, height: 180,
                   borderRadius: 24, borderWidth: 2, borderColor: theme.colors.secondary,
                   transform: [{ rotate: '15deg' }], opacity: 0.6
               }} />

               <View style={{
                   position: 'absolute', bottom: -160, left: -160, width: 300, height: 300,
                   borderRadius: 90, borderWidth: 5, borderColor: '#234C6A',
                   transform: [{ rotate: '90deg' }], opacity: 0.6
               }} />




               {/* HEADER */}
               <View style={{ paddingHorizontal: 19, paddingTop: 150 ,alignItems: 'center', justifyContent: 'center',marginBottom:-160 }}>
                   <Text variant="headlineLarge" style={{ fontWeight: '800' }}>
                       Welcome back
                   </Text>
                   <Text variant="bodyMedium" style={{ opacity: 0.7, marginTop: 10}}>
                       Sign in to continue
                   </Text>
               </View>


               {/* CARD GLASS */}
               <View style={{ flex: 1, justifyContent: 'center', paddingHorizontal: 20}}>
                   <BlurView intensity={30} tint="dark" style={{
                       borderRadius: 20,
                       overflow: 'hidden',
                       borderWidth: 1,
                       borderColor: 'rgba(255,255,255,0.08)',
                       backgroundColor: 'rgba(24,26,30,0.55)',
                   }}>
                       <View style={{ padding: 18 }}>
                           {/* EMAIL */}
                           <TextInput
                               mode="outlined"
                               label="Email"
                               value={email}
                               onChangeText={setEmail}
                               autoCapitalize="none"
                               keyboardType="email-address"
                               left={<TextInput.Icon icon="email-outline" />}
                               style={{ marginBottom: 4 }}
                           />
                           <HelperText type={emailOK ? 'info' : 'error'} visible>
                               {email ? (emailOK ? 'Looks good' : 'Invalid email') : ' '}
                           </HelperText>

                           {/* PAROLĂ */}
                           <TextInput
                               mode="outlined"
                               label="Password"
                               value={pass}
                               onChangeText={setPass}
                               secureTextEntry={!show}
                               left={<TextInput.Icon icon="lock-outline" />}
                               right={<TextInput.Icon icon={show ? 'eye-off' : 'eye'} onPress={() => setShow(!show)} />}
                               style={{ marginBottom: 4 }}
                           />
                           <HelperText type={passOK ? 'info' : 'error'} visible>
                               {pass ? (passOK ? 'OK' : 'Min 6 characters') : ' '}
                           </HelperText>


                           {/* CTA */}
                           <Button
                               mode="contained"
                               style={{ borderRadius: 14, marginTop: 6 }}
                               onPress={onLogin}
                               loading={loading}
                               disabled={!canSubmit}
                               labelStyle={{ color: 'white', fontWeight: '700' }}
                           >
                               Log In
                           </Button>
                       </View>
                   </BlurView>

                   {/* Link register */}
                   <Button mode="text" onPress={() => router.push('/sign-up')} style={{ marginTop: 14, alignSelf: 'center' }}>
                       Don’t have an account? Create one
                   </Button>
               </View>


           </LinearGradient>
       </KeyboardAvoidingView>
    );
}
