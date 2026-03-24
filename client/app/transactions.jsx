/**
 * @fileoverview Full-screen transaction list with search, type filter and
 * category chips. Can be opened from the dashboard "See all" button or from
 * Accounts (pass accountId param to pre-filter by account).
 *
 * Route: /transactions
 * Params: accountId? (optional, pre-filters to one account)
 */

import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View } from
"react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import TransactionItem from "../components/TransactionItem";
import { useBankData } from "../context/BankContext";
import { useTheme } from "../context/ThemeContext";
import {
  CATEGORIES,
  categorizeTransaction,
  detectRecurringTransactions } from
"../utils/categoryUtils";

const TYPE_FILTERS = ["all", "expense", "income"];

const EMPTY_FORM = {
  description: "",
  amount: "",
  date: new Date().toISOString().split("T")[0],
  isExpense: true,
  category: "other"
};

export default function Transactions() {
  const { isDark, theme } = useTheme();
  const c = theme.colors;
  const { t } = useTranslation();
  const router = useRouter();
  const { accountId } = useLocalSearchParams();
  const {
    transactions,
    addManualTransaction,
    updateManualTransaction,
    deleteManualTransaction,
    overrideBankTxCategory
  } = useBankData();

  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [catFilter, setCatFilter] = useState(null);
  const [datePreset, setDatePreset] = useState("all");
  const [customDateFrom, setCustomDateFrom] = useState("");
  const [customDateTo, setCustomDateTo] = useState("");
  const [amtMin, setAmtMin] = useState("");
  const [amtMax, setAmtMax] = useState("");
  const [sortBy, setSortBy] = useState("date_desc");
  const [quickPreset, setQuickPreset] = useState("none");
  const [filterOpen, setFilterOpen] = useState(false);
  const [showLongPressHint, setShowLongPressHint] = useState(true);


  const [manualModalOpen, setManualModalOpen] = useState(false);
  const [editingTx, setEditingTx] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);


  const [catModalTx, setCatModalTx] = useState(null);

  function openAddModal() {
    setEditingTx(null);
    setForm(EMPTY_FORM);
    setManualModalOpen(true);
  }

  function openEditModal(tx) {
    setEditingTx(tx);
    setForm({
      description:
      tx.creditorName ||
      tx.debtorName ||
      tx.remittanceInformationUnstructured ||
      "",
      amount: Math.abs(
        parseFloat(tx.transactionAmount?.amount || 0)
      ).toString(),
      date: tx.bookingDate || new Date().toISOString().split("T")[0],
      isExpense: parseFloat(tx.transactionAmount?.amount || 0) < 0,
      category: tx.category || "other"
    });
    setManualModalOpen(true);
  }

  async function handleSaveManual() {
    if (!form.description.trim()) return;
    const amt = parseFloat(form.amount);
    if (isNaN(amt) || amt <= 0) return;

    setSaving(true);
    try {
      if (editingTx) {
        await updateManualTransaction(editingTx.manualId, {
          description: form.description.trim(),
          amount: amt,
          date: form.date,
          isExpense: form.isExpense,
          category: form.category
        });
      } else {
        await addManualTransaction({
          description: form.description.trim(),
          amount: amt,
          date: form.date,
          isExpense: form.isExpense,
          category: form.category
        });
      }
      setManualModalOpen(false);
    } catch (e) {
      Alert.alert(t("common.error"), e?.response?.data?.error || e.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteManual(tx) {
    Alert.alert(t("transactions.deleteTitle"), t("transactions.deleteDesc"), [
    { text: t("common.cancel"), style: "cancel" },
    {
      text: t("common.delete"),
      style: "destructive",
      onPress: async () => {
        try {
          await deleteManualTransaction(tx.manualId);
        } catch (e) {
          Alert.alert(t("common.error"), e.message);
        }
      }
    }]
    );
  }

  async function handleCategoryOverride(category) {
    if (!catModalTx) return;
    try {
      await overrideBankTxCategory(catModalTx.transactionId, category);
    } catch (e) {
      Alert.alert(t("common.error"), e.message);
    } finally {
      setCatModalTx(null);
    }
  }

  const handleTxLongPress = useCallback(
    (tx) => {
      if (tx.isManual) {

        Alert.alert(
          tx.creditorName ||
          tx.debtorName ||
          tx.remittanceInformationUnstructured ||
          t("transactions.manualTx"),
          "",
          [
          {
            text: t("transactions.editTx"),
            onPress: () => openEditModal(tx)
          },
          {
            text: t("transactions.editCategory"),
            onPress: () => setCatModalTx(tx)
          },
          {
            text: t("common.delete"),
            style: "destructive",
            onPress: () => handleDeleteManual(tx)
          },
          { text: t("common.cancel"), style: "cancel" }]

        );
      } else {
        setCatModalTx(tx);
      }
    },
    [t]
  );

  const base = useMemo(() => {
    if (!accountId) return transactions;
    return transactions.filter(
      (tx) => tx.accountId === accountId || tx.resourceId === accountId
    );
  }, [transactions, accountId]);

  const recurringMerchantSet = useMemo(() => {
    const recurring = detectRecurringTransactions(base);
    return new Set(recurring.map((item) => item.name.toLowerCase().trim()));
  }, [base]);

  function formatDateInput(date) {
    const offsetMs = date.getTimezoneOffset() * 60000;
    return new Date(date.getTime() - offsetMs).toISOString().split("T")[0];
  }

  function applyQuickPreset(preset) {
    const now = new Date();

    if (preset === "today") {
      setDatePreset("today");
      setCustomDateFrom("");
      setCustomDateTo("");
    } else if (preset === "last7") {
      const from = new Date();
      from.setDate(now.getDate() - 6);
      setDatePreset("custom");
      setCustomDateFrom(formatDateInput(from));
      setCustomDateTo(formatDateInput(now));
    } else if (preset === "thisMonth") {
      setDatePreset("month");
      setCustomDateFrom("");
      setCustomDateTo("");
    }

    setQuickPreset(preset);
  }


  const filtered = useMemo(() => {
    let list = base;

    if (typeFilter === "expense") {
      list = list.filter(
        (tx) => parseFloat(tx.transactionAmount?.amount || 0) < 0
      );
    } else if (typeFilter === "income") {
      list = list.filter(
        (tx) => parseFloat(tx.transactionAmount?.amount || 0) > 0
      );
    }

    if (catFilter) {
      list = list.filter((tx) => categorizeTransaction(tx).key === catFilter);
    }


    if (datePreset !== "all") {
      const now = new Date();
      let fromDate = null;
      let toDate = null;
      if (datePreset === "today") {
        fromDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        toDate = now;
      } else if (datePreset === "week") {
        const day = now.getDay();
        const diffToMon = day === 0 ? -6 : 1 - day;
        fromDate = new Date(
          now.getFullYear(),
          now.getMonth(),
          now.getDate() + diffToMon
        );
        toDate = now;
      } else if (datePreset === "month") {
        fromDate = new Date(now.getFullYear(), now.getMonth(), 1);
        toDate = now;
      } else if (datePreset === "lastMonth") {
        fromDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        toDate = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);
      } else if (datePreset === "custom") {
        fromDate = customDateFrom ? new Date(customDateFrom) : null;
        toDate = customDateTo ? new Date(customDateTo + "T23:59:59") : null;
      }
      list = list.filter((tx) => {
        const txDate = new Date(tx.bookingDate || tx.valueDate || 0);
        if (fromDate && txDate < fromDate) return false;
        if (toDate && txDate > toDate) return false;
        return true;
      });
    }


    const minVal = amtMin !== "" ? parseFloat(amtMin) : null;
    const maxVal = amtMax !== "" ? parseFloat(amtMax) : null;
    if (minVal !== null || maxVal !== null) {
      list = list.filter((tx) => {
        const amt = Math.abs(parseFloat(tx.transactionAmount?.amount || 0));
        if (minVal !== null && amt < minVal) return false;
        if (maxVal !== null && amt > maxVal) return false;
        return true;
      });
    }

    if (search.trim()) {
      const q = search.toLowerCase().trim();
      list = list.filter((tx) => {
        const text = [
        tx.creditorName || "",
        tx.debtorName || "",
        tx.remittanceInformationUnstructured || ""].

        join(" ").
        toLowerCase();
        return text.includes(q);
      });
    }

    if (quickPreset === "manual") {
      list = list.filter((tx) => tx.isManual);
    } else if (quickPreset === "recurring") {
      list = list.filter((tx) => {
        const merchant =
        tx.creditorName || tx.remittanceInformationUnstructured || "";
        return recurringMerchantSet.has(merchant.toLowerCase().trim());
      });
    }

    return [...list].sort((a, b) => {
      if (sortBy === "date_desc" || sortBy === "date_asc") {
        const da = new Date(a.bookingDate || a.valueDate || 0);
        const db = new Date(b.bookingDate || b.valueDate || 0);
        return sortBy === "date_desc" ? db - da : da - db;
      }
      const amtA = Math.abs(parseFloat(a.transactionAmount?.amount || 0));
      const amtB = Math.abs(parseFloat(b.transactionAmount?.amount || 0));
      return sortBy === "amount_desc" ? amtB - amtA : amtA - amtB;
    });
  }, [
  base,
  typeFilter,
  catFilter,
  search,
  datePreset,
  customDateFrom,
  customDateTo,
  amtMin,
  amtMax,
  sortBy,
  quickPreset,
  recurringMerchantSet]
  );


  const activeFilterCount =
  (datePreset !== "all" ? 1 : 0) + (
  amtMin !== "" || amtMax !== "" ? 1 : 0) + (
  sortBy !== "date_desc" ? 1 : 0) + (
  quickPreset !== "none" ? 1 : 0);


  const flatData = useMemo(() => {
    const items = [];
    let currentLabel = null;
    let groupStart = -1;
    let prevItem = null;


    const dated = filtered.map((tx) => {
      const d = tx.bookingDate || tx.valueDate;
      const label = d ?
      new Date(d).toLocaleDateString("ro-RO", {
        weekday: "short",
        day: "numeric",
        month: "short"
      }) :
      "—";
      return { tx, label };
    });

    dated.forEach(({ tx, label }, idx) => {
      const isNewSection = label !== currentLabel;
      const isLastInSection =
      idx === dated.length - 1 || dated[idx + 1].label !== label;

      if (isNewSection) {

        if (prevItem && prevItem.type === "tx") prevItem.isLast = true;
        items.push({ type: "header", date: label, id: `h-${label}-${idx}` });
        currentLabel = label;
        groupStart = idx;
      }

      const item = {
        type: "tx",
        tx,
        isFirst: isNewSection,
        isLast: isLastInSection,
        id: `tx-${tx.transactionId || idx}`
      };
      items.push(item);
      prevItem = item;
    });

    return items;
  }, [filtered]);


  const usedCats = useMemo(() => {
    const keys = new Set(base.map((tx) => categorizeTransaction(tx).key));
    return CATEGORIES.filter((cat) => keys.has(cat.key));
  }, [base]);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.bg }} edges={["top"]}>
      {}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          paddingHorizontal: 20,
          paddingVertical: 14,
          backgroundColor: c.surface,
          borderBottomWidth: 0.5,
          borderBottomColor: c.border
        }}>
        
        <Pressable
          onPress={() => router.back()}
          className="active:opacity-60"
          style={{ marginRight: 14, padding: 2 }}>
          
          <Ionicons name="arrow-back" size={24} color={c.foreground} />
        </Pressable>
        <Text
          style={{
            color: c.foreground,
            fontSize: 18,
            fontWeight: "700",
            flex: 1
          }}>
          
          {t("transactions.title")}
        </Text>
        <Text style={{ color: c.textMuted, fontSize: 13, marginRight: 12 }}>
          {filtered.length} {t("transactions.count")}
        </Text>
        {}
        <Pressable
          onPress={() => setFilterOpen(true)}
          className="active:opacity-70"
          style={{ padding: 4, position: "relative" }}>
          
          <Ionicons
            name="options-outline"
            size={22}
            color={activeFilterCount > 0 ? c.primary : c.foreground} />
          
          {activeFilterCount > 0 &&
          <View
            style={{
              position: "absolute",
              top: 0,
              right: 0,
              width: 14,
              height: 14,
              borderRadius: 7,
              backgroundColor: c.primary,
              alignItems: "center",
              justifyContent: "center"
            }}>
            
              <Text style={{ color: "#fff", fontSize: 9, fontWeight: "700" }}>
                {activeFilterCount}
              </Text>
            </View>
          }
        </Pressable>
      </View>

      {}
      <View
        style={{
          paddingHorizontal: 16,
          paddingVertical: 10,
          backgroundColor: c.surface,
          borderBottomWidth: 0.5,
          borderBottomColor: c.border
        }}>
        
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            backgroundColor: c.card,
            borderRadius: 14,
            borderWidth: 1,
            borderColor: c.border,
            paddingHorizontal: 12,
            paddingVertical: Platform.OS === "ios" ? 10 : 6
          }}>
          
          <Ionicons
            name="search-outline"
            size={18}
            color={c.textMuted}
            style={{ marginRight: 8 }} />
          
          <TextInput
            style={{ flex: 1, color: c.foreground, fontSize: 15 }}
            placeholder={t("transactions.searchPlaceholder")}
            placeholderTextColor={c.textMuted}
            value={search}
            onChangeText={setSearch}
            returnKeyType="search" />
          
          {search.length > 0 &&
          <Pressable
            onPress={() => setSearch("")}
            className="active:opacity-60">
            
              <Ionicons name="close-circle" size={18} color={c.textMuted} />
            </Pressable>
          }
        </View>
      </View>

      {}
      <View
        style={{
          backgroundColor: c.surface,
          borderBottomWidth: 0.5,
          borderBottomColor: c.border
        }}>
        
        {}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{
            paddingHorizontal: 16,
            paddingVertical: 10,
            gap: 8
          }}>
          
          {TYPE_FILTERS.map((f) =>
          <Pressable
            key={f}
            onPress={() => setTypeFilter(f)}
            className="active:opacity-80"
            style={{
              paddingHorizontal: 18,
              paddingVertical: 7,
              borderRadius: 20,
              backgroundColor: typeFilter === f ? c.primary : c.card,
              borderWidth: 1,
              borderColor: typeFilter === f ? c.primary : c.border
            }}>
            
              <Text
              style={{
                color: typeFilter === f ? "white" : c.textMuted,
                fontWeight: "600",
                fontSize: 13
              }}>
              
                {t(`transactions.type.${f}`)}
              </Text>
            </Pressable>
          )}
        </ScrollView>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{
            paddingHorizontal: 16,
            paddingBottom: 10,
            gap: 8,
            alignItems: "center"
          }}>
          
          <Text
            style={{
              color: c.textMuted,
              fontSize: 11,
              fontWeight: "700",
              textTransform: "uppercase",
              marginRight: 4
            }}>
            
            {t("transactions.quickPresetsLabel")}
          </Text>
          {[
          "today",
          "last7",
          "thisMonth",
          "manual",
          "recurring"].
          map((preset) =>
          <Pressable
            key={preset}
            onPress={() => applyQuickPreset(preset)}
            className="active:opacity-80"
            style={{
              paddingHorizontal: 14,
              paddingVertical: 6,
              borderRadius: 20,
              backgroundColor: quickPreset === preset ? c.primary : c.card,
              borderWidth: 1,
              borderColor: quickPreset === preset ? c.primary : c.border
            }}>
            
              <Text
              style={{
                color: quickPreset === preset ? "#fff" : c.textMuted,
                fontWeight: "600",
                fontSize: 12
              }}>
              
                {t(`transactions.quickPresets.${preset}`)}
              </Text>
            </Pressable>
          )}
        </ScrollView>

        {}
        {usedCats.length > 0 &&
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{
            paddingHorizontal: 16,
            paddingBottom: 10,
            gap: 8
          }}>
          
            <Pressable
            onPress={() => setCatFilter(null)}
            className="active:opacity-80"
            style={{
              paddingHorizontal: 14,
              paddingVertical: 6,
              borderRadius: 20,
              flexDirection: "row",
              alignItems: "center",
              gap: 5,
              backgroundColor: !catFilter ? c.primary + "18" : c.card,
              borderWidth: 1,
              borderColor: !catFilter ? c.primary : c.border
            }}>
            
              <Text
              style={{
                color: !catFilter ? c.primary : c.textMuted,
                fontWeight: "600",
                fontSize: 13
              }}>
              
                {t("transactions.allCategories")}
              </Text>
            </Pressable>
            {usedCats.map((cat) =>
          <Pressable
            key={cat.key}
            onPress={() =>
            setCatFilter(catFilter === cat.key ? null : cat.key)
            }
            className="active:opacity-80"
            style={{
              paddingHorizontal: 14,
              paddingVertical: 6,
              borderRadius: 20,
              flexDirection: "row",
              alignItems: "center",
              gap: 5,
              backgroundColor:
              catFilter === cat.key ? cat.color + "18" : c.card,
              borderWidth: 1,
              borderColor: catFilter === cat.key ? cat.color : c.border
            }}>
            
                <Ionicons
              name={cat.icon}
              size={14}
              color={catFilter === cat.key ? cat.color : c.textMuted} />
            
                <Text
              style={{
                color: catFilter === cat.key ? cat.color : c.textMuted,
                fontWeight: "600",
                fontSize: 13
              }}>
              
                  {t(`analytics.categories.${cat.key}`)}
                </Text>
              </Pressable>
          )}
          </ScrollView>
        }
      </View>

      {showLongPressHint &&
      <View
        style={{
          marginHorizontal: 16,
          marginTop: 10,
          marginBottom: 2,
          paddingHorizontal: 12,
          paddingVertical: 10,
          backgroundColor: `${c.primary}12`,
          borderRadius: 12,
          borderWidth: 1,
          borderColor: `${c.primary}35`,
          flexDirection: "row",
          alignItems: "center",
          gap: 10
        }}>
        
          <Ionicons name="information-circle" size={18} color={c.primary} />
          <View style={{ flex: 1 }}>
            <Text
            style={{
              color: c.foreground,
              fontSize: 12,
              fontWeight: "700",
              marginBottom: 2
            }}>
            
              {t("transactions.longPressHintTitle")}
            </Text>
            <Text style={{ color: c.textMuted, fontSize: 12 }}>
              {t("transactions.longPressHintBody")}
            </Text>
          </View>
          <Pressable onPress={() => setShowLongPressHint(false)}>
            <Text style={{ color: c.primary, fontSize: 12, fontWeight: "700" }}>
              {t("transactions.dismissHint")}
            </Text>
          </Pressable>
        </View>
      }

      {}
      <FlatList
        data={flatData}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingBottom: 40, paddingTop: 4 }}
        renderItem={({ item }) => {
          if (item.type === "header") {
            return (
              <View
                style={{
                  paddingHorizontal: 20,
                  paddingTop: 16,
                  paddingBottom: 6
                }}>
                
                <Text
                  style={{
                    color: c.textMuted,
                    fontSize: 11,
                    fontWeight: "700",
                    letterSpacing: 0.6,
                    textTransform: "uppercase"
                  }}>
                  
                  {item.date}
                </Text>
              </View>);

          }

          return (
            <View
              style={{
                marginHorizontal: 16,
                backgroundColor: c.card,
                borderTopLeftRadius: item.isFirst ? 16 : 0,
                borderTopRightRadius: item.isFirst ? 16 : 0,
                borderBottomLeftRadius: item.isLast ? 16 : 0,
                borderBottomRightRadius: item.isLast ? 16 : 0,
                overflow: "hidden",
                marginBottom: item.isLast ? 4 : 0,
                borderWidth: 1,
                borderColor: c.border,
                borderTopWidth: item.isFirst ? 1 : 0,
                borderBottomWidth: item.isLast ? 1 : 0
              }}>
              
              <TransactionItem
                tx={item.tx}
                isLast={item.isLast}
                showCategory
                onLongPress={() => handleTxLongPress(item.tx)} />
              
            </View>);

        }}
        ListEmptyComponent={
        <View style={{ paddingTop: 80, alignItems: "center" }}>
            <Ionicons
            name="receipt-outline"
            size={52}
            color={c.textMuted + "50"} />
          
            <Text style={{ color: c.textMuted, fontSize: 15, marginTop: 14 }}>
              {search.length > 0 ?
            t("transactions.noResults") :
            t("transactions.empty")}
            </Text>
          </View>
        } />
      

      {}
      <Modal
        visible={filterOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setFilterOpen(false)}>
        
        <View
          style={{
            flex: 1,
            backgroundColor: "#00000088",
            justifyContent: "flex-end"
          }}>
          
          <View
            style={{
              backgroundColor: c.surface,
              borderTopLeftRadius: 28,
              borderTopRightRadius: 28,
              paddingHorizontal: 20,
              paddingTop: 16,
              paddingBottom: Platform.OS === "ios" ? 48 : 32,
              maxHeight: "82%"
            }}>
            
            {}
            <View style={{ alignItems: "center", marginBottom: 16 }}>
              <View
                style={{
                  width: 40,
                  height: 4,
                  borderRadius: 2,
                  backgroundColor: c.border
                }} />
              
            </View>

            {}
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                marginBottom: 20
              }}>
              
              <Text
                style={{
                  color: c.foreground,
                  fontWeight: "700",
                  fontSize: 17,
                  flex: 1
                }}>
                
                {t("transactions.filters")}
              </Text>
              <Pressable
                onPress={() => {
                  setDatePreset("all");
                  setCustomDateFrom("");
                  setCustomDateTo("");
                  setAmtMin("");
                  setAmtMax("");
                  setSortBy("date_desc");
                  setQuickPreset("none");
                }}
                className="active:opacity-70">
                
                <Text
                  style={{
                    color: c.primary,
                    fontSize: 14,
                    fontWeight: "600",
                    marginRight: 16
                  }}>
                  
                  {t("transactions.resetFilters")}
                </Text>
              </Pressable>
              <Pressable
                onPress={() => setFilterOpen(false)}
                className="active:opacity-70">
                
                <Ionicons name="close" size={22} color={c.textMuted} />
              </Pressable>
            </View>

            <ScrollView
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled">
              
              {}
              <Text
                style={{
                  color: c.textMuted,
                  fontSize: 11,
                  fontWeight: "700",
                  letterSpacing: 0.6,
                  textTransform: "uppercase",
                  marginBottom: 12
                }}>
                
                {t("transactions.sortBy")}
              </Text>
              <View
                style={{
                  flexDirection: "row",
                  flexWrap: "wrap",
                  gap: 8,
                  marginBottom: 20
                }}>
                
                {["date_desc", "date_asc", "amount_desc", "amount_asc"].map(
                  (opt) =>
                  <Pressable
                    key={opt}
                    onPress={() => setSortBy(opt)}
                    className="active:opacity-80"
                    style={{
                      paddingHorizontal: 14,
                      paddingVertical: 7,
                      borderRadius: 20,
                      backgroundColor: sortBy === opt ? c.primary : c.card,
                      borderWidth: 1,
                      borderColor: sortBy === opt ? c.primary : c.border
                    }}>
                    
                      <Text
                      style={{
                        color: sortBy === opt ? "#fff" : c.textMuted,
                        fontSize: 13,
                        fontWeight: "600"
                      }}>
                      
                        {t(`transactions.sortOptions.${opt}`)}
                      </Text>
                    </Pressable>

                )}
              </View>

              {}
              <Text
                style={{
                  color: c.textMuted,
                  fontSize: 11,
                  fontWeight: "700",
                  letterSpacing: 0.6,
                  textTransform: "uppercase",
                  marginBottom: 12
                }}>
                
                {t("transactions.dateRange")}
              </Text>
              <View
                style={{
                  flexDirection: "row",
                  flexWrap: "wrap",
                  gap: 8,
                  marginBottom: 16
                }}>
                
                {["all", "today", "week", "month", "lastMonth", "custom"].map(
                  (preset) =>
                  <Pressable
                    key={preset}
                    onPress={() => setDatePreset(preset)}
                    className="active:opacity-80"
                    style={{
                      paddingHorizontal: 14,
                      paddingVertical: 7,
                      borderRadius: 20,
                      backgroundColor:
                      datePreset === preset ? c.primary : c.card,
                      borderWidth: 1,
                      borderColor:
                      datePreset === preset ? c.primary : c.border
                    }}>
                    
                      <Text
                      style={{
                        color: datePreset === preset ? "#fff" : c.textMuted,
                        fontSize: 13,
                        fontWeight: "600"
                      }}>
                      
                        {t(`transactions.datePresets.${preset}`)}
                      </Text>
                    </Pressable>

                )}
              </View>

              {}
              {datePreset === "custom" &&
              <View
                style={{
                  flexDirection: "row",
                  gap: 10,
                  marginBottom: 20
                }}>
                
                  <View style={{ flex: 1 }}>
                    <Text
                    style={{
                      color: c.textMuted,
                      fontSize: 12,
                      marginBottom: 6
                    }}>
                    
                      {t("transactions.from")}
                    </Text>
                    <TextInput
                    style={{
                      backgroundColor: c.card,
                      borderRadius: 10,
                      borderWidth: 1,
                      borderColor: c.border,
                      paddingHorizontal: 12,
                      paddingVertical: 8,
                      color: c.foreground,
                      fontSize: 14
                    }}
                    placeholder="YYYY-MM-DD"
                    placeholderTextColor={c.textMuted}
                    value={customDateFrom}
                    onChangeText={setCustomDateFrom}
                    keyboardType="numbers-and-punctuation" />
                  
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text
                    style={{
                      color: c.textMuted,
                      fontSize: 12,
                      marginBottom: 6
                    }}>
                    
                      {t("transactions.to")}
                    </Text>
                    <TextInput
                    style={{
                      backgroundColor: c.card,
                      borderRadius: 10,
                      borderWidth: 1,
                      borderColor: c.border,
                      paddingHorizontal: 12,
                      paddingVertical: 8,
                      color: c.foreground,
                      fontSize: 14
                    }}
                    placeholder="YYYY-MM-DD"
                    placeholderTextColor={c.textMuted}
                    value={customDateTo}
                    onChangeText={setCustomDateTo}
                    keyboardType="numbers-and-punctuation" />
                  
                  </View>
                </View>
              }

              {}
              <Text
                style={{
                  color: c.textMuted,
                  fontSize: 11,
                  fontWeight: "700",
                  letterSpacing: 0.6,
                  textTransform: "uppercase",
                  marginBottom: 12
                }}>
                
                {t("transactions.amountRange")}
              </Text>
              <View style={{ flexDirection: "row", gap: 10, marginBottom: 24 }}>
                <View style={{ flex: 1 }}>
                  <Text
                    style={{
                      color: c.textMuted,
                      fontSize: 12,
                      marginBottom: 6
                    }}>
                    
                    {t("transactions.minAmount")}
                  </Text>
                  <TextInput
                    style={{
                      backgroundColor: c.card,
                      borderRadius: 10,
                      borderWidth: 1,
                      borderColor: c.border,
                      paddingHorizontal: 12,
                      paddingVertical: 8,
                      color: c.foreground,
                      fontSize: 14
                    }}
                    placeholder="0"
                    placeholderTextColor={c.textMuted}
                    value={amtMin}
                    onChangeText={(v) => setAmtMin(v.replace(/[^0-9.]/g, ""))}
                    keyboardType="decimal-pad" />
                  
                </View>
                <View style={{ flex: 1 }}>
                  <Text
                    style={{
                      color: c.textMuted,
                      fontSize: 12,
                      marginBottom: 6
                    }}>
                    
                    {t("transactions.maxAmount")}
                  </Text>
                  <TextInput
                    style={{
                      backgroundColor: c.card,
                      borderRadius: 10,
                      borderWidth: 1,
                      borderColor: c.border,
                      paddingHorizontal: 12,
                      paddingVertical: 8,
                      color: c.foreground,
                      fontSize: 14
                    }}
                    placeholder="∞"
                    placeholderTextColor={c.textMuted}
                    value={amtMax}
                    onChangeText={(v) => setAmtMax(v.replace(/[^0-9.]/g, ""))}
                    keyboardType="decimal-pad" />
                  
                </View>
              </View>
            </ScrollView>

            {}
            <Pressable
              onPress={() => setFilterOpen(false)}
              className="active:opacity-80"
              style={{
                backgroundColor: c.primary,
                borderRadius: 14,
                paddingVertical: 14,
                alignItems: "center",
                marginTop: 8
              }}>
              
              <Text style={{ color: "#fff", fontWeight: "700", fontSize: 15 }}>
                {activeFilterCount > 0 ?
                t("transactions.activeFilters", {
                  count: activeFilterCount
                }) +
                " — " +
                t("transactions.applyFilters") :
                t("transactions.applyFilters")}
              </Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      {}
      <Pressable
        onPress={openAddModal}
        className="active:opacity-80"
        style={{
          position: "absolute",
          bottom: Platform.OS === "ios" ? 36 : 24,
          right: 20,
          width: 56,
          height: 56,
          borderRadius: 28,
          backgroundColor: c.primary,
          alignItems: "center",
          justifyContent: "center",
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.3,
          shadowRadius: 8,
          elevation: 8
        }}>
        
        <Ionicons name="add" size={28} color="#fff" />
      </Pressable>

      {}
      <Modal
        visible={manualModalOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setManualModalOpen(false)}>
        
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={{
            flex: 1,
            backgroundColor: "#00000088",
            justifyContent: "flex-end"
          }}>
          
          <View
            style={{
              backgroundColor: c.surface,
              borderTopLeftRadius: 28,
              borderTopRightRadius: 28,
              paddingHorizontal: 20,
              paddingTop: 16,
              paddingBottom: Platform.OS === "ios" ? 48 : 32,
              maxHeight: "90%"
            }}>
            
            <View style={{ alignItems: "center", marginBottom: 12 }}>
              <View
                style={{
                  width: 40,
                  height: 4,
                  borderRadius: 2,
                  backgroundColor: c.border
                }} />
              
            </View>

            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                marginBottom: 20
              }}>
              
              <Text
                style={{
                  color: c.foreground,
                  fontWeight: "700",
                  fontSize: 17,
                  flex: 1
                }}>
                
                {editingTx ? t("transactions.editTx") : t("transactions.addTx")}
              </Text>
              <Pressable
                onPress={() => setManualModalOpen(false)}
                className="active:opacity-70">
                
                <Ionicons name="close" size={22} color={c.textMuted} />
              </Pressable>
            </View>

            <ScrollView
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled">
              
              {}
              <View style={{ flexDirection: "row", gap: 10, marginBottom: 18 }}>
                {[true, false].map((isExp) =>
                <Pressable
                  key={String(isExp)}
                  onPress={() => setForm((f) => ({ ...f, isExpense: isExp }))}
                  className="active:opacity-80"
                  style={{
                    flex: 1,
                    paddingVertical: 10,
                    borderRadius: 12,
                    alignItems: "center",
                    backgroundColor:
                    form.isExpense === isExp ? c.primary : c.card,
                    borderWidth: 1,
                    borderColor:
                    form.isExpense === isExp ? c.primary : c.border
                  }}>
                  
                    <Text
                    style={{
                      color: form.isExpense === isExp ? "#fff" : c.textMuted,
                      fontWeight: "700",
                      fontSize: 14
                    }}>
                    
                      {isExp ?
                    t("transactions.type.expense") :
                    t("transactions.type.income")}
                    </Text>
                  </Pressable>
                )}
              </View>

              {}
              <Text
                style={{
                  color: c.textMuted,
                  fontSize: 12,
                  fontWeight: "600",
                  marginBottom: 6
                }}>
                
                {t("transactions.description")}
              </Text>
              <TextInput
                style={{
                  backgroundColor: c.card,
                  borderRadius: 12,
                  borderWidth: 1,
                  borderColor: c.border,
                  paddingHorizontal: 14,
                  paddingVertical: 10,
                  color: c.foreground,
                  fontSize: 15,
                  marginBottom: 14
                }}
                placeholder={t("transactions.descriptionPlaceholder")}
                placeholderTextColor={c.textMuted}
                value={form.description}
                onChangeText={(v) => setForm((f) => ({ ...f, description: v }))} />
              

              {}
              <Text
                style={{
                  color: c.textMuted,
                  fontSize: 12,
                  fontWeight: "600",
                  marginBottom: 6
                }}>
                
                {t("transactions.amount")} (RON)
              </Text>
              <TextInput
                style={{
                  backgroundColor: c.card,
                  borderRadius: 12,
                  borderWidth: 1,
                  borderColor: c.border,
                  paddingHorizontal: 14,
                  paddingVertical: 10,
                  color: c.foreground,
                  fontSize: 15,
                  marginBottom: 14
                }}
                placeholder="0.00"
                placeholderTextColor={c.textMuted}
                value={form.amount}
                onChangeText={(v) =>
                setForm((f) => ({ ...f, amount: v.replace(/[^0-9.]/g, "") }))
                }
                keyboardType="decimal-pad" />
              

              {}
              <Text
                style={{
                  color: c.textMuted,
                  fontSize: 12,
                  fontWeight: "600",
                  marginBottom: 6
                }}>
                
                {t("transactions.dateRange")}
              </Text>
              <TextInput
                style={{
                  backgroundColor: c.card,
                  borderRadius: 12,
                  borderWidth: 1,
                  borderColor: c.border,
                  paddingHorizontal: 14,
                  paddingVertical: 10,
                  color: c.foreground,
                  fontSize: 15,
                  marginBottom: 14
                }}
                placeholder="YYYY-MM-DD"
                placeholderTextColor={c.textMuted}
                value={form.date}
                onChangeText={(v) => setForm((f) => ({ ...f, date: v }))}
                keyboardType="numbers-and-punctuation" />
              

              {}
              <Text
                style={{
                  color: c.textMuted,
                  fontSize: 12,
                  fontWeight: "600",
                  marginBottom: 10
                }}>
                
                {t("transactions.category")}
              </Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ gap: 8, paddingBottom: 16 }}>
                
                {CATEGORIES.map((cat) =>
                <Pressable
                  key={cat.key}
                  onPress={() =>
                  setForm((f) => ({ ...f, category: cat.key }))
                  }
                  className="active:opacity-80"
                  style={{
                    paddingHorizontal: 14,
                    paddingVertical: 8,
                    borderRadius: 20,
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 5,
                    backgroundColor:
                    form.category === cat.key ? cat.color + "22" : c.card,
                    borderWidth: 1.5,
                    borderColor:
                    form.category === cat.key ? cat.color : c.border
                  }}>
                  
                    <Ionicons
                    name={cat.icon}
                    size={15}
                    color={
                    form.category === cat.key ? cat.color : c.textMuted
                    } />
                  
                    <Text
                    style={{
                      color:
                      form.category === cat.key ? cat.color : c.textMuted,
                      fontWeight: "600",
                      fontSize: 13
                    }}>
                    
                      {t(`analytics.categories.${cat.key}`)}
                    </Text>
                  </Pressable>
                )}
              </ScrollView>
            </ScrollView>

            <Pressable
              onPress={handleSaveManual}
              disabled={saving || !form.description.trim() || !form.amount}
              className="active:opacity-80"
              style={{
                backgroundColor:
                saving || !form.description.trim() || !form.amount ?
                c.border :
                c.primary,
                borderRadius: 14,
                paddingVertical: 14,
                alignItems: "center",
                marginTop: 8
              }}>
              
              <Text style={{ color: "#fff", fontWeight: "700", fontSize: 15 }}>
                {saving ? t("common.loading") : t("common.save")}
              </Text>
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {}
      <Modal
        visible={!!catModalTx}
        transparent
        animationType="slide"
        onRequestClose={() => setCatModalTx(null)}>
        
        <View
          style={{
            flex: 1,
            backgroundColor: "#00000088",
            justifyContent: "flex-end"
          }}>
          
          <View
            style={{
              backgroundColor: c.surface,
              borderTopLeftRadius: 28,
              borderTopRightRadius: 28,
              paddingHorizontal: 20,
              paddingTop: 16,
              paddingBottom: Platform.OS === "ios" ? 48 : 32
            }}>
            
            <View style={{ alignItems: "center", marginBottom: 12 }}>
              <View
                style={{
                  width: 40,
                  height: 4,
                  borderRadius: 2,
                  backgroundColor: c.border
                }} />
              
            </View>
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                marginBottom: 18
              }}>
              
              <Text
                style={{
                  color: c.foreground,
                  fontWeight: "700",
                  fontSize: 17,
                  flex: 1
                }}>
                
                {t("transactions.editCategory")}
              </Text>
              <Pressable
                onPress={() => setCatModalTx(null)}
                className="active:opacity-70">
                
                <Ionicons name="close" size={22} color={c.textMuted} />
              </Pressable>
            </View>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
              {CATEGORIES.map((cat) => {
                const currentKey = catModalTx ?
                categorizeTransaction(catModalTx).key :
                null;
                const isCurrent = cat.key === currentKey;
                return (
                  <Pressable
                    key={cat.key}
                    onPress={() => handleCategoryOverride(cat.key)}
                    className="active:opacity-80"
                    style={{
                      paddingHorizontal: 16,
                      paddingVertical: 9,
                      borderRadius: 20,
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 6,
                      backgroundColor: isCurrent ? cat.color + "22" : c.card,
                      borderWidth: 1.5,
                      borderColor: isCurrent ? cat.color : c.border
                    }}>
                    
                    <Ionicons
                      name={cat.icon}
                      size={16}
                      color={isCurrent ? cat.color : c.textMuted} />
                    
                    <Text
                      style={{
                        color: isCurrent ? cat.color : c.foreground,
                        fontWeight: "600",
                        fontSize: 14
                      }}>
                      
                      {t(`analytics.categories.${cat.key}`)}
                    </Text>
                  </Pressable>);

              })}
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>);

}