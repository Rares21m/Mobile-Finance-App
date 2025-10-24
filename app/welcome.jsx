import React from 'react';
import { View } from 'react-native';
import { Button, Text, useTheme } from 'react-native-paper';
import { router } from 'expo-router';
import{LinearGradient} from 'expo-linear-gradient';

export default function Welcome() {
    const theme = useTheme();

    return (
        <View style={{flex:1,backgroundColor:theme.colors.background }}>
            <LinearGradient
                colors={['#234458','#091625']}
                start={{x:0.2 , y: 0}}
                end={{x:1,y:1}}
                style={{flex:1,padding:24,justifyContent:'center',alignItems:'center'}}
                >
                <View
                    style={{position: 'absolute',
                    top:-100,
                    left:-100,
                    width:380,
                    height:380,
                    borderRadius:200,
                    backgroundColor:'#F8729C',
                    transform:[{rotate:'22deg'}],
                }}
                />
                <View
                    style={{
                        position: 'absolute',
                        top: 140,
                        right: -30,
                        width: 260,
                        height: 260,
                        borderRadius: 150,
                        backgroundColor: '#3B82F6',
                        transform: [{ rotate: '-18deg' }]
                    }}
                />

                <View
                    style={{
                        position: 'absolute',
                        top: 170,      // poți schimba poziția
                        left:45,
                        width: 250,
                        height: 250,
                        borderWidth: 2,   // grosimea marginii
                        borderColor: 'white',  // culoarea marginii
                        borderRadius: 20, // opțional, ca să fie colțuri ușor rotunjite
                        backgroundColor: 'transparent', // fără umplere
                        transform: [{ rotate: '30deg' }],

                    }}
                />

         <View style={{flex:1,justifyContent:'flex-end',padding:24,allignItems:'flex-start',marginBottom:15}}>
            <Text variant="headlineLarge" style={{ fontWeight: '800'}}>
                All your finances
            </Text>

            <Text variant="headlineLarge" style={{fontWeight:'800', marginBottom: 10}}>in one app
            </Text>

             <Text variant="bodyMedium" style={{opacity: 0.7,marginBottom: 28,lineHeight: 22}}>Master your money. Save more, stress less. </Text>

        </View>
                <View style={{flexDirection:'row',gap:10,width:'100%',marginBottom:40,}}>
                    <Button
                    mode="outlined"
                    style={{flex: 1,borderRadius:12}}
                    labelStyle={{color:'white',fontWeight:'bold'}}
                    onPress={()=>router.push('./sign-in')}>
                        Log In
                    </Button>

                    <Button
                        mode="contained"
                        style={{ flex: 1, borderRadius: 12, backgroundColor: theme.colors.primary }}
                        labelStyle={{color:'white',fontWeight:'bold'}}
                        onPress={() => router.push('/sign-up')}
                    >
                        Register
                    </Button>
                </View>
            </LinearGradient>
        </View>
    );
}
