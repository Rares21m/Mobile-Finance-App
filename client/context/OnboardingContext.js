/**
 * @fileoverview Onboarding context for the Novence app.
 * Stores the user's financial profile collected during the onboarding wizard.
 * Profile is persisted in AsyncStorage AND synced to the server (PostgreSQL).
 * On mount the context tries to hydrate from the server first (via the user
 * object stored in AuthContext), then falls back to AsyncStorage.
 *
 * Profile shape:
 * {
 *   goal: "savings" | "expense_control" | "investment" | "debt_freedom",
 *   incomeRange: "under_1500" | "1500_3000" | "3000_6000" | "over_6000",
 *   priorityCategories: string[]   // e.g. ["food","transport","shopping"]
 * }
 */

import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState } from
"react";
import api from "../services/api";
import { useAuth } from "./AuthContext";

const PROFILE_KEY = "user_financial_profile_v1";
const ONBOARDING_DONE_KEY = "onboarding_done_v1";

const OnboardingContext = createContext(null);

export function useOnboarding() {
  const ctx = useContext(OnboardingContext);
  if (!ctx)
  throw new Error("useOnboarding must be used inside OnboardingProvider");
  return ctx;
}

export function OnboardingProvider({ children }) {
  const { user, token } = useAuth();
  const [profile, setProfile] = useState(null);
  const [isOnboardingDone, setIsOnboardingDone] = useState(false);
  const [profileLoaded, setProfileLoaded] = useState(false);



  useEffect(() => {

    if (!user) {
      Promise.all([
      AsyncStorage.removeItem(PROFILE_KEY),
      AsyncStorage.removeItem(ONBOARDING_DONE_KEY)]
      ).catch(() => {});
      setProfile(null);
      setIsOnboardingDone(false);
      setProfileLoaded(true);
      return;
    }

    async function load() {
      try {

        if (user?.profileGoal) {
          const serverProfile = {
            goal: user.profileGoal,
            incomeRange: user.profileIncomeRange,
            priorityCategories: user.profileCategories || []
          };
          setProfile(serverProfile);
          setIsOnboardingDone(true);

          await AsyncStorage.setItem(
            PROFILE_KEY,
            JSON.stringify(serverProfile)
          );
          await AsyncStorage.setItem(ONBOARDING_DONE_KEY, "true");
          return;
        }




        const userKey = `_${user.id}`;
        const [rawProfile, rawDone] = await Promise.all([
        AsyncStorage.getItem(PROFILE_KEY + userKey),
        AsyncStorage.getItem(ONBOARDING_DONE_KEY + userKey)]
        );
        if (rawProfile) setProfile(JSON.parse(rawProfile));
        if (rawDone === "true") setIsOnboardingDone(true);
      } catch {

      } finally {
        setProfileLoaded(true);
      }
    }
    load();
  }, [user]);


  const saveProfile = useCallback(
    async (newProfile) => {
      try {

        const userKey = user?.id ? `_${user.id}` : "";
        await Promise.all([
        AsyncStorage.setItem(
          PROFILE_KEY + userKey,
          JSON.stringify(newProfile)
        ),
        AsyncStorage.setItem(ONBOARDING_DONE_KEY + userKey, "true")]
        );
        setProfile(newProfile);
        setIsOnboardingDone(true);


        if (token) {
          api.
          put("/auth/onboarding-profile", {
            goal: newProfile.goal,
            incomeRange: newProfile.incomeRange,
            priorityCategories: newProfile.priorityCategories
          }).
          catch(() => {

          });
        }
      } catch {

      }
    },
    [token]
  );


  const resetOnboarding = useCallback(async () => {
    try {
      await Promise.all([
      AsyncStorage.removeItem(PROFILE_KEY),
      AsyncStorage.removeItem(ONBOARDING_DONE_KEY)]
      );
    } catch {

    }
    setProfile(null);
    setIsOnboardingDone(false);
  }, []);

  return (
    <OnboardingContext.Provider
      value={{
        profile,
        isOnboardingDone,
        profileLoaded,
        saveProfile,
        resetOnboarding
      }}>
      
      {children}
    </OnboardingContext.Provider>);

}