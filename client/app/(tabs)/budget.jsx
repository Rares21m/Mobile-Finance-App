import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useCallback, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View } from
"react-native";
import SectionHeader from "../../components/SectionHeader";
import { useBudget } from "../../context/BudgetContext";
import { useGoals } from "../../context/GoalsContext";
import { useOnboarding } from "../../context/OnboardingContext";
import { useTheme } from "../../context/ThemeContext";
import { CATEGORIES } from "../../utils/categoryUtils";
import ProgressBar from "../../components/budget/ProgressBar";
import BudgetItem from "../../components/budget/BudgetItem";
import EventBudgetItem from "../../components/budget/EventBudgetItem";
import GoalCard from "../../components/budget/GoalCard";
import BudgetDoughnut from "../../components/budget/BudgetDoughnut";

const GOAL_ICONS = [
"star-outline",
"home-outline",
"car-outline",
"airplane-outline",
"laptop-outline",
"gift-outline",
"school-outline",
"medkit-outline",
"fitness-outline",
"paw-outline",
"diamond-outline",
"umbrella-outline"];

const GOAL_COLORS = [
"#10B981",
"#818CF8",
"#F59E0B",
"#EF4444",
"#3B82F6",
"#EC4899",
"#8B5CF6",
"#14B8A6"];





export default function Budget() {
  const { isDark, theme } = useTheme();
  const c = theme.colors;
  const { t } = useTranslation();
  const { profile } = useOnboarding();
  const {
    limits,
    loaded,
    setBudgetLimit,
    currentMonthSpending,
    totalBudgeted,
    totalSpentOnBudgeted,
    getBudgetStatus,
    getBudgetExplainability,
    getSuggestedBudgets,
    applySuggestedBudgets,
    getSmartWeightSuggestions,
    eventBudgets,
    addEventBudget,
    removeEventBudget,
    getEventBudgetStatus
  } = useBudget();
  const { goals, goalsLoaded, createGoal, updateGoal, deleteGoal } = useGoals();


  const [sheetMode, setSheetMode] = useState(null);
  const [pendingCat, setPendingCat] = useState(null);
  const [amountInput, setAmountInput] = useState("");


  const [suggMode, setSuggMode] = useState("smart");


  const [eventName, setEventName] = useState("");
  const [eventLimit, setEventLimit] = useState("");
  const [eventStartDate, setEventStartDate] = useState("");
  const [eventEndDate, setEventEndDate] = useState("");
  const [pendingEventBudget, setPendingEventBudget] = useState(null);


  const [goalName, setGoalName] = useState("");
  const [goalTarget, setGoalTarget] = useState("");
  const [goalSaved, setGoalSaved] = useState("");
  const [goalDeadline, setGoalDeadline] = useState("");
  const [goalIcon, setGoalIcon] = useState("star-outline");
  const [goalColor, setGoalColor] = useState("#10B981");
  const [pendingGoal, setPendingGoal] = useState(null);


  const budgetedKeys = Object.keys(limits);


  const activeBudgetKeys = useMemo(
    () => budgetedKeys.filter((k) => limits[k] > 0),
    [budgetedKeys, limits]
  );


  const unbudgetedCategories = useMemo(
    () => CATEGORIES.filter((cat) => !limits[cat.key]),
    [limits]
  );


  const suggestedCategories = useMemo(
    () =>
    CATEGORIES.filter(
      (cat) => !limits[cat.key] && (currentMonthSpending[cat.key] ?? 0) > 0
    ),
    [limits, currentMonthSpending]
  );


  const categoriesOnBudget = useMemo(
    () =>
    activeBudgetKeys.filter((k) => getBudgetStatus(k).status !== "over").
    length,
    [activeBudgetKeys, getBudgetStatus]
  );

  const summaryPct = useMemo(
    () =>
    totalBudgeted > 0 ?
    Math.min(
      Math.round(totalSpentOnBudgeted / totalBudgeted * 100),
      100
    ) :
    0,
    [totalBudgeted, totalSpentOnBudgeted]
  );

  const budgetExplainability = useMemo(
    () => getBudgetExplainability(),
    [getBudgetExplainability]
  );


  const openPickSheet = () => {
    setSheetMode("pick");
    setPendingCat(null);
    setAmountInput("");
  };

  const openEditSheet = useCallback(
    (cat) => {
      setPendingCat(cat);
      setAmountInput(limits[cat.key] ? limits[cat.key].toString() : "");
      setSheetMode("edit");
    },
    [limits]
  );

  const handlePickCategory = (cat) => {
    setPendingCat(cat);
    setAmountInput("");
    setSheetMode("edit");
  };

  const handleSave = () => {
    if (!pendingCat) return;
    setBudgetLimit(pendingCat.key, amountInput);
    setSheetMode(null);
    setPendingCat(null);
    setAmountInput("");

    setTimeout(() => {}, 1500);
  };

  const handleDelete = () => {
    if (!pendingCat) return;
    setBudgetLimit(pendingCat.key, null);
    setSheetMode(null);
    setPendingCat(null);
    setAmountInput("");
  };

  const closeSheet = () => {
    setSheetMode(null);
    setPendingCat(null);
    setAmountInput("");
  };

  const openGoalSheet = () => {
    setGoalName("");
    setGoalTarget("");
    setGoalSaved("0");
    setGoalDeadline("");
    setGoalIcon("star-outline");
    setGoalColor("#10B981");
    setPendingGoal(null);
    setSheetMode("goal-add");
  };

  const handleGoalSave = async () => {
    if (!goalName.trim() || !goalTarget) return;
    const data = {
      name: goalName.trim(),
      targetAmount: parseFloat(goalTarget),
      savedAmount: parseFloat(goalSaved) || 0,
      deadline: goalDeadline || null,
      icon: goalIcon,
      color: goalColor
    };
    try {
      if (pendingGoal) {
        await updateGoal(pendingGoal.id, data);
      } else {
        await createGoal(data);
      }

    } catch (e) {

    }
    setSheetMode(null);
    setPendingGoal(null);
  };

  const handleGoalDelete = async () => {
    if (!pendingGoal) return;
    try {
      await deleteGoal(pendingGoal.id);
    } catch (e) {}
    setSheetMode(null);
    setPendingGoal(null);
  };

  const isEditingExisting = pendingCat && !!limits[pendingCat.key];


  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      {}
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingHorizontal: 20,
          paddingTop: 64,
          paddingBottom: 100
        }}>
        
        {}
        {}
        {activeBudgetKeys.length > 0 &&
        <BudgetDoughnut
          totalBudgeted={totalBudgeted}
          totalSpent={totalSpentOnBudgeted}
          c={c}
          isDark={isDark}
          t={t} />

        }

        {}
        {activeBudgetKeys.length > 0 ?
        <View style={{ marginTop: 20 }}>
            <SectionHeader title={t("budget.activeBudgets")} />
            {activeBudgetKeys.
          slice().
          sort((a, b) => {

            const order = { over: 0, warning: 1, ok: 2 };
            return (
              order[getBudgetStatus(a).status] -
              order[getBudgetStatus(b).status]);

          }).
          map((key) =>
          <BudgetItem
            key={key}
            categoryKey={key}
            onEdit={openEditSheet}
            c={c}
            t={t} />

          )}
          </View> : (


        <View
          style={{
            alignItems: "center",
            paddingTop: 20,
            paddingHorizontal: 24
          }}>
          
            <View
            style={{
              flexDirection: "row",
              gap: 8,
              marginBottom: 20,
              alignItems: "flex-end"
            }}>
            
              <View
              style={{
                width: 14,
                height: 36,
                borderRadius: 7,
                backgroundColor: `${c.primary}25`
              }} />
            
              <View
              style={{
                width: 14,
                height: 56,
                borderRadius: 7,
                backgroundColor: `${c.primary}55`
              }} />
            
              <View
              style={{
                width: 14,
                height: 28,
                borderRadius: 7,
                backgroundColor: `${c.primary}35`
              }} />
            
            </View>
            <Text
            style={{
              color: c.foreground,
              fontSize: 18,
              fontWeight: "700",
              textAlign: "center",
              marginBottom: 8
            }}>
            
              {t("budget.emptyTitle")}
            </Text>
            <Text
            style={{
              color: c.textMuted,
              fontSize: 14,
              textAlign: "center",
              lineHeight: 20,
              marginBottom: 28
            }}>
            
              {t("budget.emptyDesc")}
            </Text>
            <Pressable
            onPress={openPickSheet}
            className="active:opacity-70"
            style={{ overflow: "hidden", borderRadius: 14 }}>
            
              <LinearGradient
              colors={[c.primary, c.primaryDark]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={{
                paddingHorizontal: 28,
                paddingVertical: 14,
                flexDirection: "row",
                alignItems: "center",
                gap: 8
              }}>
              
                <Ionicons name="add" size={20} color="white" />
                <Text
                style={{ color: "white", fontWeight: "700", fontSize: 15 }}>
                
                  {t("budget.addFirst")}
                </Text>
              </LinearGradient>
            </Pressable>
          </View>)
        }

        {}
        {profile &&
        activeBudgetKeys.length === 0 &&
        (() => {
          const smartSuggestions = getSmartWeightSuggestions();
          const classicSuggestions = getSuggestedBudgets(profile);
          const hasSmartData = smartSuggestions.length > 0;
          const activeSuggestions =
          suggMode === "smart" && hasSmartData ?
          smartSuggestions :
          classicSuggestions;
          if (activeSuggestions.length === 0) return null;

          const incomeMap = {
            under_1500: "< 1.500",
            "1500_3000": "1.500–3.000",
            "3000_6000": "3.000–6.000",
            over_6000: "> 6.000"
          };

          return (
            <View
              style={{
                marginTop: 24,
                backgroundColor: isDark ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.02)",
                borderRadius: 24,
                padding: 20,
                borderWidth: 1,
                borderColor: isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.04)"
              }}>
              
                {}
                <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  marginBottom: 16
                }}>
                
                  <View
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: 22,
                    backgroundColor: `${c.primary}15`,
                    alignItems: "center",
                    justifyContent: "center",
                    marginRight: 14
                  }}>
                  
                    <Ionicons name="sparkles" size={22} color={c.primary} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text
                    style={{
                      color: c.foreground,
                      fontWeight: "800",
                      fontSize: 16
                    }}>
                    
                      {t("budget.suggestedTitle")}
                    </Text>
                    <Text
                    style={{ color: c.textMuted, fontSize: 12, marginTop: 2, fontWeight: "500" }}>
                    
                      {t("budget.suggestedDesc")}
                    </Text>
                  </View>
                </View>

                {}
                <View
                style={{
                  flexDirection: "row",
                  backgroundColor: isDark ? "rgba(0,0,0,0.3)" : "rgba(0,0,0,0.04)",
                  borderRadius: 20,
                  padding: 4,
                  marginBottom: 16
                }}>
                
                  <Pressable
                  onPress={() => setSuggMode("smart")}
                  style={{
                    flex: 1,
                    paddingVertical: 10,
                    borderRadius: 16,
                    alignItems: "center",
                    backgroundColor:
                    suggMode === "smart" ? c.primary : "transparent",
                    opacity: !hasSmartData ? 0.4 : 1
                  }}
                  disabled={!hasSmartData}>
                  
                    <Text
                    style={{
                      color: suggMode === "smart" ? "white" : c.textMuted,
                      fontWeight: "600",
                      fontSize: 12
                    }}>
                    
                      📊 {t("budget.smartWeights")}
                    </Text>
                  </Pressable>
                  <Pressable
                  onPress={() => setSuggMode("5030")}
                  className="active:opacity-80"
                  style={{
                    flex: 1,
                    paddingVertical: 7,
                    borderRadius: 10,
                    alignItems: "center",
                    backgroundColor:
                    suggMode === "5030" || !hasSmartData ?
                    c.primary :
                    "transparent"
                  }}>
                  
                    <Text
                    style={{
                      color:
                      suggMode === "5030" || !hasSmartData ?
                      "white" :
                      c.textMuted,
                      fontWeight: "600",
                      fontSize: 12
                    }}>
                    
                      ✦ 50/30/20
                    </Text>
                  </Pressable>
                </View>

                {}
                <Text
                style={{ color: c.textMuted, fontSize: 12, marginBottom: 12 }}>
                
                  {suggMode === "smart" && hasSmartData ?
                `📈 ${t("budget.smartWeightsDesc")}` :
                `📊 ${incomeMap[profile.incomeRange] || "—"} RON/lună`}
                </Text>

                {}
                {activeSuggestions.map((s) => {
                const cat = CATEGORIES.find((x) => x.key === s.key) || {
                  icon: "ellipsis-horizontal",
                  color: "#6B7280"
                };
                return (
                  <View
                    key={s.key}
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      paddingVertical: 8,
                      borderBottomWidth: 0.5,
                      borderBottomColor: c.border
                    }}>
                    
                      <Ionicons
                      name={cat.icon}
                      size={16}
                      color={cat.color}
                      style={{ marginRight: 10 }} />
                    
                      <Text
                      style={{ color: c.foreground, fontSize: 14, flex: 1 }}>
                      
                        {t(`analytics.categories.${s.key}`)}
                      </Text>
                      {suggMode === "smart" && hasSmartData ?
                    <Text
                      style={{
                        color: c.textMuted,
                        fontSize: 11,
                        marginRight: 6
                      }}>
                      
                          {s.percentage}%
                        </Text> :

                    <Text
                      style={{
                        color: c.textMuted,
                        fontSize: 11,
                        marginRight: 6
                      }}>
                      
                          {s.type === "need" ?
                      t("budget.needsLabel") :
                      t("budget.wantsLabel")}
                        </Text>
                    }
                      <Text
                      style={{
                        color: c.foreground,
                        fontWeight: "600",
                        fontSize: 14
                      }}>
                      
                        {s.suggestedLimit.toFixed(0)} {t("common.currency")}
                      </Text>
                    </View>);

              })}

                {}
                <View style={{ flexDirection: "row", gap: 10, marginTop: 16 }}>
                  <Pressable
                  onPress={() => applySuggestedBudgets(activeSuggestions)}
                  className="active:opacity-80"
                  style={{ flex: 1, borderRadius: 12, overflow: "hidden" }}>
                  
                    <LinearGradient
                    colors={[c.primary, c.primaryDark]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={{ paddingVertical: 12, alignItems: "center" }}>
                    
                      <Text
                      style={{
                        color: "white",
                        fontWeight: "700",
                        fontSize: 14
                      }}>
                      
                        {t("budget.acceptSuggestions")}
                      </Text>
                    </LinearGradient>
                  </Pressable>
                  <Pressable
                  onPress={openPickSheet}
                  className="active:opacity-70"
                  style={{
                    flex: 1,
                    borderRadius: 12,
                    borderWidth: 1,
                    borderColor: c.border,
                    paddingVertical: 12,
                    alignItems: "center"
                  }}>
                  
                    <Text
                    style={{
                      color: c.textMuted,
                      fontWeight: "600",
                      fontSize: 14
                    }}>
                    
                      {t("budget.customizeBudgets")}
                    </Text>
                  </Pressable>
                </View>
              </View>);

        })()}

        {}
        {suggestedCategories.length > 0 && activeBudgetKeys.length > 0 &&
        <View style={{ marginTop: 28 }}>
            <SectionHeader title={t("budget.suggestions")} />
            <Text
            style={{
              color: c.textMuted,
              fontSize: 13,
              marginBottom: 14,
              marginTop: -4
            }}>
            
              {t("budget.suggestionsDesc")}
            </Text>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
              {suggestedCategories.map((cat) =>
            <Pressable
              key={cat.key}
              onPress={() => openEditSheet(cat)}
              className="active:opacity-70"
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 6,
                backgroundColor: `${cat.color}15`,
                borderRadius: 20,
                paddingHorizontal: 14,
                paddingVertical: 8,
                borderWidth: 1,
                borderColor: `${cat.color}30`
              }}>
              
                  <Ionicons name={cat.icon} size={14} color={cat.color} />
                  <Text
                style={{
                  color: cat.color,
                  fontWeight: "600",
                  fontSize: 13
                }}>
                
                    {t(`analytics.categories.${cat.key}`)}
                  </Text>
                  <Text style={{ color: c.textMuted, fontSize: 12 }}>
                    {(currentMonthSpending[cat.key] || 0).toFixed(0)}{" "}
                    {t("common.currency")}
                  </Text>
                </Pressable>
            )}
            </View>
          </View>
        }

        {}
        <View style={{ marginTop: 28 }}>
          <SectionHeader
            title={t("budget.eventBudgets")}
            rightText={t("budget.addEvent")}
            onPress={() => {
              setEventName("");
              setEventLimit("");
              const today = new Date();
              setEventStartDate(today.toISOString().split("T")[0]);
              const nextWeek = new Date(today.getTime() + 7 * 86400000);
              setEventEndDate(nextWeek.toISOString().split("T")[0]);
              setPendingEventBudget(null);
              setSheetMode("event-add");
            }} />
          

          {eventBudgets.length === 0 ?
          <Pressable
            onPress={() => {
              setEventName("");
              setEventLimit("");
              const today = new Date();
              setEventStartDate(today.toISOString().split("T")[0]);
              const nextWeek = new Date(today.getTime() + 7 * 86400000);
              setEventEndDate(nextWeek.toISOString().split("T")[0]);
              setPendingEventBudget(null);
              setSheetMode("event-add");
            }}
            style={({ pressed }) => ({
              backgroundColor: isDark ? "rgba(255,255,255,0.02)" : "rgba(0,0,0,0.01)",
              borderRadius: 24,
              padding: 24,
              alignItems: "center",
              borderWidth: 2,
              borderStyle: "dashed",
              borderColor: isDark ? "rgba(255,255,255,0.15)" : "rgba(0,0,0,0.1)",
              opacity: pressed ? 0.7 : 1
            })}>
            
              <View style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.04)", alignItems: "center", justifyContent: "center", marginBottom: 12 }}>
                <Ionicons name="calendar-outline" size={24} color={c.textMuted} />
              </View>
              <Text style={{ color: c.foreground, fontSize: 16, fontWeight: "700", marginBottom: 4 }}>
                {t("budget.noEventBudgets")}
              </Text>
              <Text style={{ color: c.textMuted, fontSize: 13, textAlign: "center" }}>
                Apasă pentru a adăuga un buget nou.
              </Text>
            </Pressable> : (


          [...eventBudgets].
          sort((a, b) => {
            const order = {
              active: 0,
              warning: 0,
              over: 0,
              upcoming: 1,
              expired: 2
            };
            const sa = getEventBudgetStatus(a).status;
            const sb = getEventBudgetStatus(b).status;
            return (order[sa] ?? 1) - (order[sb] ?? 1);
          }).
          map((eb) =>
          <EventBudgetItem
            key={eb.id}
            budget={eb}
            onEdit={(b) => {
              setPendingEventBudget(b);
              setEventName(b.name);
              setEventLimit(b.totalLimit.toString());
              setEventStartDate(b.startDate);
              setEventEndDate(b.endDate);
              setSheetMode("event-edit");
            }}
            onDelete={(id) => removeEventBudget(id)}
            getStatus={getEventBudgetStatus}
            c={c}
            t={t} />

          ))
          }
        </View>

        {}
        <View style={{ marginTop: 28 }}>
          <SectionHeader
            title={t("goals.title")}
            rightText={t("goals.addGoal")}
            onPress={openGoalSheet} />
          
          {!goalsLoaded ? null : goals.length === 0 ?
          <Pressable
            onPress={openGoalSheet}
            style={({ pressed }) => ({
              backgroundColor: isDark ? "rgba(255,255,255,0.02)" : "rgba(0,0,0,0.01)",
              borderRadius: 24,
              padding: 24,
              alignItems: "center",
              borderWidth: 2,
              borderStyle: "dashed",
              borderColor: isDark ? "rgba(255,255,255,0.15)" : "rgba(0,0,0,0.1)",
              opacity: pressed ? 0.7 : 1
            })}>
            
              <View style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.04)", alignItems: "center", justifyContent: "center", marginBottom: 12 }}>
                <Ionicons name="flag-outline" size={24} color={c.textMuted} />
              </View>
              <Text style={{ color: c.foreground, fontSize: 16, fontWeight: "700", marginBottom: 4 }}>
                {t("goals.empty")}
              </Text>
              <Text style={{ color: c.textMuted, fontSize: 13, textAlign: "center" }}>
                Apasă pentru a-ți stabili un obiectiv.
              </Text>
            </Pressable> :

          goals.map((goal) =>
          <GoalCard
            key={goal.id}
            goal={goal}
            onPress={(g) => {
              setPendingGoal(g);
              setGoalName(g.name);
              setGoalTarget(g.targetAmount.toString());
              setGoalSaved(g.savedAmount.toString());
              setGoalDeadline(g.deadline ? g.deadline.split("T")[0] : "");
              setGoalIcon(g.icon);
              setGoalColor(g.color);
              setSheetMode("goal-edit");
            }}
            c={c}
            t={t} />

          )
          }
        </View>
      </ScrollView>

      {}
      {unbudgetedCategories.length > 0 && activeBudgetKeys.length > 0 &&
      <Pressable
        onPress={openPickSheet}
        className="active:opacity-80"
        style={{
          position: "absolute",
          bottom: 28,
          right: 20,
          overflow: "hidden",
          borderRadius: 18,
          elevation: 4,
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.18,
          shadowRadius: 8
        }}>
        
          <LinearGradient
          colors={[c.primary, c.primaryDark]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{
            width: 54,
            height: 54,
            alignItems: "center",
            justifyContent: "center"
          }}>
          
            <Ionicons name="add" size={26} color="white" />
          </LinearGradient>
        </Pressable>
      }

      {}
      {sheetMode === "pick" &&
      <Pressable
        onPress={closeSheet}
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: c.overlay
        }}>
        
          <View style={{ flex: 1 }} />
        </Pressable>
      }
      {sheetMode === "pick" &&
      <View
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          backgroundColor: c.surface,
          borderTopWidth: 1,
          borderTopColor: c.border,
          borderTopLeftRadius: 24,
          borderTopRightRadius: 24,
          paddingHorizontal: 24,
          paddingTop: 24,
          paddingBottom: 48,
          maxHeight: "70%"
        }}>
        
          {}
          <View
          style={{
            width: 40,
            height: 4,
            borderRadius: 2,
            backgroundColor: c.handle,
            alignSelf: "center",
            marginBottom: 20
          }} />
        
          <Text
          style={{
            color: c.foreground,
            fontWeight: "700",
            fontSize: 18,
            marginBottom: 4
          }}>
          
            {t("budget.pickCategory")}
          </Text>
          <Text
          style={{
            color: c.textMuted,
            fontSize: 13,
            marginBottom: 20
          }}>
          
            {t("budget.pickCategoryDesc")}
          </Text>
          <ScrollView showsVerticalScrollIndicator={false}>
            {unbudgetedCategories.map((cat) => {
            const spent = currentMonthSpending[cat.key] || 0;
            return (
              <Pressable
                key={cat.key}
                onPress={() => handlePickCategory(cat)}
                className="active:opacity-70"
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  paddingVertical: 13,
                  borderBottomWidth: 0.5,
                  borderBottomColor: c.border
                }}>
                
                  <View
                  style={{
                    width: 38,
                    height: 38,
                    borderRadius: 19,
                    backgroundColor: `${cat.color}18`,
                    alignItems: "center",
                    justifyContent: "center",
                    marginRight: 14
                  }}>
                  
                    <Ionicons name={cat.icon} size={18} color={cat.color} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text
                    style={{
                      color: c.foreground,
                      fontWeight: "600",
                      fontSize: 15
                    }}>
                    
                      {t(`analytics.categories.${cat.key}`)}
                    </Text>
                    {spent > 0 &&
                  <Text
                    style={{
                      color: c.textMuted,
                      fontSize: 12,
                      marginTop: 1
                    }}>
                    
                        {t("budget.spentThisMonth", {
                      amount: spent.toFixed(0),
                      currency: t("common.currency")
                    })}
                      </Text>
                  }
                  </View>
                  <Ionicons
                  name="chevron-forward"
                  size={16}
                  color={c.textMuted} />
                
                </Pressable>);

          })}
          </ScrollView>
          <Pressable
          onPress={closeSheet}
          style={{ alignItems: "center", paddingTop: 16 }}>
          
            <Text
            style={{ color: c.textMuted, fontWeight: "500", fontSize: 14 }}>
            
              {t("common.cancel")}
            </Text>
          </Pressable>
        </View>
      }

      {}
      {sheetMode === "edit" &&
      <Pressable
        onPress={closeSheet}
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: c.overlay
        }}>
        
          <View style={{ flex: 1 }} />
        </Pressable>
      }
      {sheetMode === "edit" && pendingCat &&
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "position" : undefined}
        style={{ position: "absolute", bottom: 0, left: 0, right: 0 }}>
        
          <View
          style={{
            backgroundColor: c.surface,
            borderTopWidth: 1,
            borderTopColor: c.border,
            borderTopLeftRadius: 24,
            borderTopRightRadius: 24,
            paddingHorizontal: 24,
            paddingTop: 24,
            paddingBottom: 48
          }}>
          
            {}
            <View
            style={{
              width: 40,
              height: 4,
              borderRadius: 2,
              backgroundColor: c.handle,
              alignSelf: "center",
              marginBottom: 24
            }} />
          
            {}
            <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              marginBottom: 24
            }}>
            
              <View
              style={{
                width: 46,
                height: 46,
                borderRadius: 23,
                backgroundColor: `${pendingCat.color}18`,
                alignItems: "center",
                justifyContent: "center",
                marginRight: 14
              }}>
              
                <Ionicons
                name={pendingCat.icon}
                size={22}
                color={pendingCat.color} />
              
              </View>
              <View>
                <Text
                style={{
                  color: c.textMuted,
                  fontSize: 12,
                  fontWeight: "500"
                }}>
                
                  {t("budget.budgetFor")}
                </Text>
                <Text
                style={{
                  color: c.foreground,
                  fontSize: 18,
                  fontWeight: "700"
                }}>
                
                  {t(`analytics.categories.${pendingCat.key}`)}
                </Text>
              </View>
            </View>

            {}
            <Text
            style={{
              color: c.textMuted,
              fontSize: 13,
              fontWeight: "500",
              marginBottom: 8
            }}>
            
              {t("budget.monthlyLimit")} ({t("common.currency")})
            </Text>
            <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              backgroundColor: c.card,
              borderRadius: 14,
              borderWidth: 1,
              borderColor: c.border,
              paddingHorizontal: 16,
              marginBottom: 20
            }}>
            
              <Text
              style={{
                color: c.textMuted,
                fontSize: 16,
                fontWeight: "500",
                marginRight: 8
              }}>
              
                {t("common.currency")}
              </Text>
              <TextInput
              style={{
                flex: 1,
                color: c.foreground,
                fontSize: 22,
                fontWeight: "700",
                paddingVertical: 14
              }}
              placeholder="0"
              placeholderTextColor={c.placeholder}
              value={amountInput}
              onChangeText={setAmountInput}
              keyboardType="decimal-pad"
              autoFocus />
            
            </View>

            {}
            <Pressable
            onPress={handleSave}
            className="active:opacity-80"
            style={{ borderRadius: 14, overflow: "hidden", marginBottom: 12 }}>
            
              <LinearGradient
              colors={[c.primary, c.primaryDark]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={{
                paddingVertical: 15,
                alignItems: "center"
              }}>
              
                <Text
                style={{ color: "white", fontWeight: "700", fontSize: 16 }}>
                
                  {t("common.save")}
                </Text>
              </LinearGradient>
            </Pressable>

            {isEditingExisting &&
          <Pressable
            onPress={handleDelete}
            className="active:opacity-70"
            style={{
              paddingVertical: 13,
              alignItems: "center",
              borderRadius: 14,
              borderWidth: 1,
              borderColor: `${c.expense}40`,
              marginBottom: 4
            }}>
            
                <Text
              style={{
                color: c.expense,
                fontWeight: "600",
                fontSize: 15
              }}>
              
                  {t("budget.removeBudget")}
                </Text>
              </Pressable>
          }

            <Pressable
            onPress={closeSheet}
            style={{ alignItems: "center", paddingTop: 12 }}>
            
              <Text
              style={{ color: c.textMuted, fontWeight: "500", fontSize: 14 }}>
              
                {t("common.cancel")}
              </Text>
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      }

      {}
      {(sheetMode === "event-add" || sheetMode === "event-edit") &&
      <Pressable
        onPress={closeSheet}
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: c.overlay
        }}>
        
          <View style={{ flex: 1 }} />
        </Pressable>
      }
      {(sheetMode === "event-add" || sheetMode === "event-edit") &&
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "position" : undefined}
        style={{ position: "absolute", bottom: 0, left: 0, right: 0 }}>
        
          <View
          style={{
            backgroundColor: c.surface,
            borderTopWidth: 1,
            borderTopColor: c.border,
            borderTopLeftRadius: 24,
            borderTopRightRadius: 24,
            paddingHorizontal: 24,
            paddingTop: 24,
            paddingBottom: 48
          }}>
          
            {}
            <View
            style={{
              width: 40,
              height: 4,
              borderRadius: 2,
              backgroundColor: c.handle,
              alignSelf: "center",
              marginBottom: 24
            }} />
          
            {}
            <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              marginBottom: 20
            }}>
            
              <View
              style={{
                width: 46,
                height: 46,
                borderRadius: 23,
                backgroundColor: `${c.primary}18`,
                alignItems: "center",
                justifyContent: "center",
                marginRight: 14
              }}>
              
                <Ionicons name="calendar" size={22} color={c.primary} />
              </View>
              <Text
              style={{ color: c.foreground, fontSize: 18, fontWeight: "700" }}>
              
                {sheetMode === "event-edit" ?
              t("budget.editEvent") :
              t("budget.addEvent")}
              </Text>
            </View>

            {}
            <Text
            style={{
              color: c.textMuted,
              fontSize: 13,
              fontWeight: "500",
              marginBottom: 6
            }}>
            
              {t("budget.eventName")}
            </Text>
            <TextInput
            style={{
              backgroundColor: c.card,
              borderRadius: 14,
              borderWidth: 1,
              borderColor: c.border,
              paddingHorizontal: 16,
              paddingVertical: 12,
              color: c.foreground,
              fontSize: 15,
              marginBottom: 14
            }}
            placeholder={t("budget.eventNamePlaceholder")}
            placeholderTextColor={c.placeholder}
            value={eventName}
            onChangeText={setEventName} />
          

            {}
            <Text
            style={{
              color: c.textMuted,
              fontSize: 13,
              fontWeight: "500",
              marginBottom: 6
            }}>
            
              {t("budget.totalLimit")} ({t("common.currency")})
            </Text>
            <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              backgroundColor: c.card,
              borderRadius: 14,
              borderWidth: 1,
              borderColor: c.border,
              paddingHorizontal: 16,
              marginBottom: 14
            }}>
            
              <Text
              style={{
                color: c.textMuted,
                fontSize: 16,
                fontWeight: "500",
                marginRight: 8
              }}>
              
                {t("common.currency")}
              </Text>
              <TextInput
              style={{
                flex: 1,
                color: c.foreground,
                fontSize: 20,
                fontWeight: "700",
                paddingVertical: 12
              }}
              placeholder="0"
              placeholderTextColor={c.placeholder}
              value={eventLimit}
              onChangeText={setEventLimit}
              keyboardType="decimal-pad" />
            
            </View>

            {}
            <View style={{ flexDirection: "row", gap: 12, marginBottom: 20 }}>
              <View style={{ flex: 1 }}>
                <Text
                style={{
                  color: c.textMuted,
                  fontSize: 13,
                  fontWeight: "500",
                  marginBottom: 6
                }}>
                
                  {t("budget.startDate")}
                </Text>
                <TextInput
                style={{
                  backgroundColor: c.card,
                  borderRadius: 14,
                  borderWidth: 1,
                  borderColor: c.border,
                  paddingHorizontal: 14,
                  paddingVertical: 12,
                  color: c.foreground,
                  fontSize: 14,
                  textAlign: "center"
                }}
                placeholder="YYYY-MM-DD"
                placeholderTextColor={c.placeholder}
                value={eventStartDate}
                onChangeText={setEventStartDate} />
              
              </View>
              <View style={{ flex: 1 }}>
                <Text
                style={{
                  color: c.textMuted,
                  fontSize: 13,
                  fontWeight: "500",
                  marginBottom: 6
                }}>
                
                  {t("budget.endDate")}
                </Text>
                <TextInput
                style={{
                  backgroundColor: c.card,
                  borderRadius: 14,
                  borderWidth: 1,
                  borderColor: c.border,
                  paddingHorizontal: 14,
                  paddingVertical: 12,
                  color: c.foreground,
                  fontSize: 14,
                  textAlign: "center"
                }}
                placeholder="YYYY-MM-DD"
                placeholderTextColor={c.placeholder}
                value={eventEndDate}
                onChangeText={setEventEndDate} />
              
              </View>
            </View>

            {}
            <Pressable
            onPress={() => {
              if (
              !eventName.trim() ||
              !eventLimit ||
              !eventStartDate ||
              !eventEndDate)

              return;
              if (sheetMode === "event-edit" && pendingEventBudget) {

                removeEventBudget(pendingEventBudget.id);
              }
              addEventBudget({
                name: eventName.trim(),
                totalLimit: eventLimit,
                startDate: eventStartDate,
                endDate: eventEndDate,
                categories: []
              });
              triggerEvaluate();
              closeSheet();
            }}
            className="active:opacity-80"
            style={{ borderRadius: 14, overflow: "hidden", marginBottom: 12 }}>
            
              <LinearGradient
              colors={[c.primary, c.primaryDark]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={{ paddingVertical: 15, alignItems: "center" }}>
              
                <Text
                style={{ color: "white", fontWeight: "700", fontSize: 16 }}>
                
                  {t("common.save")}
                </Text>
              </LinearGradient>
            </Pressable>

            {}
            {sheetMode === "event-edit" && pendingEventBudget &&
          <Pressable
            onPress={() => {
              removeEventBudget(pendingEventBudget.id);
              closeSheet();
            }}
            className="active:opacity-70"
            style={{
              paddingVertical: 13,
              alignItems: "center",
              borderRadius: 14,
              borderWidth: 1,
              borderColor: `${c.expense}40`,
              marginBottom: 4
            }}>
            
                <Text
              style={{ color: c.expense, fontWeight: "600", fontSize: 15 }}>
              
                  {t("budget.removeEvent")}
                </Text>
              </Pressable>
          }

            <Pressable
            onPress={closeSheet}
            style={{ alignItems: "center", paddingTop: 12 }}>
            
              <Text
              style={{ color: c.textMuted, fontWeight: "500", fontSize: 14 }}>
              
                {t("common.cancel")}
              </Text>
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      }

      {}
      {(sheetMode === "goal-add" || sheetMode === "goal-edit") &&
      <Pressable
        onPress={() => setSheetMode(null)}
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: c.overlay
        }}>
        
          <View style={{ flex: 1 }} />
        </Pressable>
      }
      {(sheetMode === "goal-add" || sheetMode === "goal-edit") &&
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "position" : undefined}
        style={{ position: "absolute", bottom: 0, left: 0, right: 0 }}>
        
          <View
          style={{
            backgroundColor: c.surface,
            borderTopWidth: 1,
            borderTopColor: c.border,
            borderTopLeftRadius: 24,
            borderTopRightRadius: 24,
            paddingHorizontal: 24,
            paddingTop: 24,
            paddingBottom: 48
          }}>
          
            {}
            <View
            style={{
              width: 40,
              height: 4,
              borderRadius: 2,
              backgroundColor: c.handle,
              alignSelf: "center",
              marginBottom: 20
            }} />
          
            {}
            <Text
            style={{
              color: c.foreground,
              fontSize: 18,
              fontWeight: "700",
              marginBottom: 20
            }}>
            
              {sheetMode === "goal-edit" ?
            t("goals.editGoal") :
            t("goals.addGoal")}
            </Text>

            {}
            <Text
            style={{
              color: c.textMuted,
              fontSize: 13,
              fontWeight: "500",
              marginBottom: 6
            }}>
            
              {t("goals.goalName")}
            </Text>
            <TextInput
            style={{
              backgroundColor: c.card,
              borderRadius: 14,
              borderWidth: 1,
              borderColor: c.border,
              paddingHorizontal: 16,
              paddingVertical: 12,
              color: c.foreground,
              fontSize: 15,
              marginBottom: 14
            }}
            placeholder={t("goals.goalNamePlaceholder")}
            placeholderTextColor={c.placeholder}
            value={goalName}
            onChangeText={setGoalName} />
          

            {}
            <View style={{ flexDirection: "row", gap: 12, marginBottom: 14 }}>
              <View style={{ flex: 1 }}>
                <Text
                style={{
                  color: c.textMuted,
                  fontSize: 13,
                  fontWeight: "500",
                  marginBottom: 6
                }}>
                
                  {t("goals.target")} ({t("common.currency")})
                </Text>
                <TextInput
                style={{
                  backgroundColor: c.card,
                  borderRadius: 14,
                  borderWidth: 1,
                  borderColor: c.border,
                  paddingHorizontal: 14,
                  paddingVertical: 12,
                  color: c.foreground,
                  fontSize: 15,
                  textAlign: "center"
                }}
                placeholder="0"
                placeholderTextColor={c.placeholder}
                value={goalTarget}
                onChangeText={setGoalTarget}
                keyboardType="decimal-pad" />
              
              </View>
              <View style={{ flex: 1 }}>
                <Text
                style={{
                  color: c.textMuted,
                  fontSize: 13,
                  fontWeight: "500",
                  marginBottom: 6
                }}>
                
                  {t("goals.saved")} ({t("common.currency")})
                </Text>
                <TextInput
                style={{
                  backgroundColor: c.card,
                  borderRadius: 14,
                  borderWidth: 1,
                  borderColor: c.border,
                  paddingHorizontal: 14,
                  paddingVertical: 12,
                  color: c.foreground,
                  fontSize: 15,
                  textAlign: "center"
                }}
                placeholder="0"
                placeholderTextColor={c.placeholder}
                value={goalSaved}
                onChangeText={setGoalSaved}
                keyboardType="decimal-pad" />
              
              </View>
            </View>

            {}
            <Text
            style={{
              color: c.textMuted,
              fontSize: 13,
              fontWeight: "500",
              marginBottom: 6
            }}>
            
              {t("goals.deadline")} ({t("goals.optional")})
            </Text>
            <TextInput
            style={{
              backgroundColor: c.card,
              borderRadius: 14,
              borderWidth: 1,
              borderColor: c.border,
              paddingHorizontal: 16,
              paddingVertical: 12,
              color: c.foreground,
              fontSize: 15,
              marginBottom: 14
            }}
            placeholder="YYYY-MM-DD"
            placeholderTextColor={c.placeholder}
            value={goalDeadline}
            onChangeText={setGoalDeadline} />
          

            {}
            <Text
            style={{
              color: c.textMuted,
              fontSize: 13,
              fontWeight: "500",
              marginBottom: 8
            }}>
            
              {t("goals.icon")}
            </Text>
            <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={{ marginBottom: 14 }}
            contentContainerStyle={{ gap: 10 }}>
            
              {GOAL_ICONS.map((ico) =>
            <Pressable
              key={ico}
              onPress={() => setGoalIcon(ico)}
              style={{
                width: 42,
                height: 42,
                borderRadius: 21,
                backgroundColor:
                goalIcon === ico ? goalColor + "28" : c.card,
                borderWidth: 2,
                borderColor: goalIcon === ico ? goalColor : c.border,
                alignItems: "center",
                justifyContent: "center"
              }}>
              
                  <Ionicons
                name={ico}
                size={20}
                color={goalIcon === ico ? goalColor : c.textMuted} />
              
                </Pressable>
            )}
            </ScrollView>

            {}
            <Text
            style={{
              color: c.textMuted,
              fontSize: 13,
              fontWeight: "500",
              marginBottom: 8
            }}>
            
              {t("goals.color")}
            </Text>
            <View
            style={{
              flexDirection: "row",
              flexWrap: "wrap",
              gap: 10,
              marginBottom: 20
            }}>
            
              {GOAL_COLORS.map((col) =>
            <Pressable
              key={col}
              onPress={() => setGoalColor(col)}
              style={{
                width: 32,
                height: 32,
                borderRadius: 16,
                backgroundColor: col,
                borderWidth: goalColor === col ? 3 : 0,
                borderColor: c.foreground
              }} />

            )}
            </View>

            {}
            <Pressable
            onPress={handleGoalSave}
            className="active:opacity-80"
            style={{ borderRadius: 14, overflow: "hidden", marginBottom: 12 }}>
            
              <LinearGradient
              colors={[goalColor, goalColor + "CC"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={{ paddingVertical: 15, alignItems: "center" }}>
              
                <Text
                style={{ color: "white", fontWeight: "700", fontSize: 16 }}>
                
                  {t("common.save")}
                </Text>
              </LinearGradient>
            </Pressable>

            {sheetMode === "goal-edit" &&
          <Pressable
            onPress={handleGoalDelete}
            className="active:opacity-70"
            style={{
              paddingVertical: 13,
              alignItems: "center",
              borderRadius: 14,
              borderWidth: 1,
              borderColor: c.expense + "40",
              marginBottom: 4
            }}>
            
                <Text
              style={{ color: c.expense, fontWeight: "600", fontSize: 15 }}>
              
                  {t("goals.deleteGoal")}
                </Text>
              </Pressable>
          }

            <Pressable
            onPress={() => setSheetMode(null)}
            style={{ alignItems: "center", paddingTop: 12 }}>
            
              <Text
              style={{ color: c.textMuted, fontWeight: "500", fontSize: 14 }}>
              
                {t("common.cancel")}
              </Text>
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      }
    </View>);

}