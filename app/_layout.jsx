import * as React from "react";
import {Slot} from 'expo-router';
import {Provider as PaperProvider} from 'react-native-paper';
import {paperTheme} from '../constants/theme';

export default function RootLayout() {
    return (
        <PaperProvider theme={paperTheme}>
            {/*Slot=locul unde se vor afisa ecranele din app/ */}
            <Slot />
            </PaperProvider>
    );
}