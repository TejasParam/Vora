import { useState } from 'react'
import axios from 'axios'

interface MealInfo {
  name: string
  calories: number
  protein: number
  carbs: number
  fat: number
  dietary_restrictions: string
}

interface MealPlan {
  breakfast: MealInfo[]
  lunch: MealInfo[]
  dinner: MealInfo[]
}

interface ChatMessage {
  type: 'user' | 'assistant'
  content: string
}

interface MealSelection {
  breakfast: MealInfo[];
  lunch: MealInfo[];
  dinner: MealInfo[];
}

interface Preferences {
  vegan: boolean;
  vegetarian: boolean;
  gluten_free: boolean;
  halal: boolean;
  target_calories: number;
  target_protein: number;
}

type DietaryPreference = 'vegan' | 'vegetarian' | 'gluten_free' | 'halal';
type NutritionalGoal = 'target_calories' | 'target_protein';

function App() {
  const [preferences, setPreferences] = useState<Preferences>({
    vegan: false,
    vegetarian: false,
    gluten_free: false,
    halal: false,
    target_calories: 2000,
    target_protein: 50
  })

  const [mealPlan, setMealPlan] = useState<MealPlan | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    {
      type: 'assistant',
      content: 'Hi! I can help you create a personalized meal plan. Tell me about your dietary preferences and goals. For example, you can say "I want a vegetarian meal plan with 2000 calories and 70g of protein" or "Create a gluten-free plan with high protein."'
    }
  ])
  const [userInput, setUserInput] = useState('')
  const [selectedMeals, setSelectedMeals] = useState<MealSelection>({
    breakfast: [],
    lunch: [],
    dinner: []
  })
  const [activeTab, setActiveTab] = useState<'chat' | 'preferences' | 'meal-plan'>('chat')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setMealPlan(null)
    
    try {
      const response = await axios.post('http://localhost:8000/get_meal_plan', preferences)
      if (response.data.error) {
        throw new Error(response.data.error)
      }
      setMealPlan(response.data)
    } catch (err: any) {
      const errorMessage = err.response?.data?.error || err.message || 'Failed to fetch meal plan. Please try again.'
      setError(errorMessage)
      console.error('Error fetching meal plan:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleChatSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!userInput.trim()) return

    // Add user message to chat
    const userMessage = { type: 'user' as const, content: userInput }
    setChatMessages(prev => [...prev, userMessage])
    setUserInput('')
    setLoading(true)
    setError(null)

    try {
      const response = await axios.post('http://localhost:8000/chat', { message: userMessage.content })
      if (response.data.error) {
        throw new Error(response.data.error)
      }

      // Add assistant response to chat
      setChatMessages(prev => [...prev, { type: 'assistant', content: response.data.message }])
      setMealPlan(response.data.meal_plan)
      setPreferences(response.data.extracted_preferences)
    } catch (err: any) {
      const errorMessage = err.response?.data?.error || err.message || 'Failed to process your request. Please try again.'
      setError(errorMessage)
      setChatMessages(prev => [...prev, { type: 'assistant', content: `Error: ${errorMessage}` }])
      console.error('Error in chat:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target
    
    if (type === 'checkbox' && isDietaryPreference(name)) {
      setPreferences(prev => ({
        ...prev,
        [name]: checked
      }))
    } else if (type === 'number' && isNutritionalGoal(name)) {
      const numValue = value === '' ? 0 : Math.max(0, parseInt(value))
      setPreferences(prev => ({
        ...prev,
        [name]: numValue
      }))
    }
  }

  const isDietaryPreference = (name: string): name is DietaryPreference => {
    return ['vegan', 'vegetarian', 'gluten_free', 'halal'].includes(name)
  }

  const isNutritionalGoal = (name: string): name is NutritionalGoal => {
    return ['target_calories', 'target_protein'].includes(name)
  }

  const handleRegenerate = async () => {
    setLoading(true)
    setError(null)
    
    try {
      const response = await axios.post('http://localhost:8000/get_meal_plan', preferences)
      if (response.data.error) {
        throw new Error(response.data.error)
      }
      setMealPlan(response.data)
    } catch (err: any) {
      const errorMessage = err.response?.data?.error || err.message || 'Failed to regenerate meal plan. Please try again.'
      setError(errorMessage)
      console.error('Error regenerating meal plan:', err)
    } finally {
      setLoading(false)
    }
  }

  const calculateTotalMacros = () => {
    const allMeals = [
      ...selectedMeals.breakfast,
      ...selectedMeals.lunch,
      ...selectedMeals.dinner
    ];
    
    return {
      calories: allMeals.reduce((sum, meal) => sum + meal.calories, 0),
      protein: allMeals.reduce((sum, meal) => sum + meal.protein, 0),
      carbs: allMeals.reduce((sum, meal) => sum + meal.carbs, 0),
      fat: allMeals.reduce((sum, meal) => sum + meal.fat, 0)
    };
  };

  const calculateProgress = () => {
    const totals = calculateTotalMacros();
    const targets = {
      calories: preferences.target_calories,
      protein: preferences.target_protein,
      carbs: preferences.target_calories * 0.5 / 4, // 50% of calories from carbs
      fat: preferences.target_calories * 0.3 / 9 // 30% of calories from fat
    };

    return {
      calories: (totals.calories / targets.calories) * 100,
      protein: (totals.protein / targets.protein) * 100,
      carbs: (totals.carbs / targets.carbs) * 100,
      fat: (totals.fat / targets.fat) * 100
    };
  };

  const handleMealSelect = (mealType: keyof MealSelection, meal: MealInfo) => {
    setSelectedMeals(prev => {
      const currentSelections = prev[mealType];
      const mealIndex = currentSelections.findIndex(m => m.name === meal.name);
      
      if (mealIndex >= 0) {
        // Remove meal if already selected
        return {
          ...prev,
          [mealType]: currentSelections.filter(m => m.name !== meal.name)
        };
      } else {
        // Add meal if not selected
        return {
          ...prev,
          [mealType]: [...currentSelections, meal]
        };
      }
    });
  };

  const handleClearSelections = () => {
    setSelectedMeals({
      breakfast: [],
      lunch: [],
      dinner: []
    });
  };

  const MacroProgressBar = ({ label, value, max, unit }: { label: string; value: number; max: number; unit: string }) => {
    const percentage = Math.min((value / max) * 100, 100);
    return (
      <div className="space-y-1">
        <div className="flex justify-between text-sm">
          <span>{label}</span>
          <span className="font-medium text-gray-800">{Math.round(value)}/{Math.round(max)}{unit}</span>
        </div>
        <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
          <div 
            className={`h-full rounded-full ${percentage > 100 ? 'bg-red-500' : 'bg-primary-500'}`}
            style={{ width: `${Math.min(percentage, 100)}%` }}
          />
        </div>
      </div>
    );
  };

  const MealCard = ({ meal, type, isSelected }: { meal: MealInfo; type: keyof MealSelection; isSelected: boolean }) => (
    <div 
      onClick={() => handleMealSelect(type, meal)}
      className={`fancy-card ${isSelected ? 'ring-2 ring-green-500' : ''}`}
    >
      <div className="relative">
        <div className="absolute -top-4 -right-4">
          {isSelected && (
            <div className="bg-green-500 text-white p-2 rounded-full shadow-lg">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
              </svg>
            </div>
          )}
        </div>
      </div>
      <h4 className="font-playfair text-xl font-semibold text-gray-800 mb-3">{meal.name}</h4>
      <div className="space-y-3">
        <MacroBar label="Calories" value={meal.calories} maxValue={800} />
        <MacroBar label="Protein" value={meal.protein} maxValue={40} unit="g" />
        <MacroBar label="Carbs" value={meal.carbs} maxValue={100} unit="g" />
        <MacroBar label="Fat" value={meal.fat} maxValue={35} unit="g" />
      </div>
      <div className="mt-4 pt-3 border-t border-gray-100">
        <p className="text-xs text-gray-500 mb-1">Dietary Info:</p>
        <div className="flex flex-wrap gap-2">
          {meal.dietary_restrictions.split(', ').map((restriction, index) => (
            <span key={index} className="px-2 py-1 bg-green-50 text-green-700 rounded-full text-xs font-medium">
              {restriction}
            </span>
          ))}
        </div>
      </div>
    </div>
  );

  const MacroBar = ({ label, value, maxValue, unit = '' }: { label: string; value: number; maxValue: number; unit?: string }) => {
    const percentage = Math.min((value / maxValue) * 100, 100);
    return (
      <div className="space-y-1">
        <div className="flex justify-between text-sm">
          <span className="text-gray-600">{label}</span>
          <span className="font-medium text-gray-800">{value}{unit}</span>
        </div>
        <div className="progress-bar">
          <div 
            className="progress-bar-fill"
            style={{ width: `${percentage}%` }}
          />
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-12 relative">
          {/* Decorative Elements */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-1 bg-gradient-to-r from-transparent via-green-500 to-transparent"></div>
          
          <h1 className="fancy-title text-6xl mb-4">Vora</h1>
          <p className="text-xl text-gray-600 font-light">Your Personal AI-Powered Nutrition Assistant</p>
          
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-32 h-1 bg-gradient-to-r from-transparent via-green-500 to-transparent"></div>
        </div>

        {/* Tabs */}
        <div className="flex justify-center mb-8">
          <nav className="glass-effect rounded-2xl p-1.5 shadow-lg">
            {['chat', 'preferences', 'meal-plan'].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab as 'chat' | 'preferences' | 'meal-plan')}
                className={`fancy-tab ${activeTab === tab ? 'active' : ''}`}
              >
                <span className="capitalize">{tab.replace('-', ' ')}</span>
              </button>
            ))}
          </nav>
        </div>

        {/* Tab Content */}
        <div className="space-y-8">
          {/* Chat Tab */}
          {activeTab === 'chat' && (
            <div className="glass-effect rounded-2xl p-6">
              <div className="mb-6 max-h-[500px] overflow-y-auto custom-scrollbar">
                {chatMessages.map((msg, index) => (
                  <div
                    key={index}
                    className={`chat-message ${
                      msg.type === 'user' ? 'chat-message-user' : 'chat-message-assistant'
                    }`}
                  >
                    {msg.content}
                  </div>
                ))}
              </div>
              <form onSubmit={handleChatSubmit} className="flex gap-4">
                <input
                  type="text"
                  value={userInput}
                  onChange={(e) => setUserInput(e.target.value)}
                  placeholder="Tell me your dietary preferences..."
                  className="fancy-input flex-grow"
                  disabled={loading}
                />
                <button type="submit" className="btn-primary" disabled={loading}>
                  {loading ? (
                    <span className="flex items-center">
                      <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Processing
                    </span>
                  ) : (
                    'Send'
                  )}
                </button>
              </form>
            </div>
          )}

          {/* Preferences Tab */}
          {activeTab === 'preferences' && (
            <div className="glass-effect rounded-2xl p-6">
              <form onSubmit={handleSubmit} className="space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-6">
                    <h3 className="fancy-title text-2xl mb-4">Dietary Preferences</h3>
                    <div className="space-y-4">
                      {['vegan', 'vegetarian', 'gluten_free', 'halal'].map((pref) => (
                        <label key={pref} className="flex items-center space-x-3 p-3 rounded-xl hover:bg-green-50 transition-colors">
                          <input
                            type="checkbox"
                            name={pref}
                            checked={preferences[pref as DietaryPreference]}
                            onChange={handleInputChange}
                            className="fancy-checkbox"
                          />
                          <span className="text-gray-700 capitalize">{pref.replace('_', ' ')}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                  
                  <div className="space-y-6">
                    <h3 className="fancy-title text-2xl mb-4">Nutritional Goals</h3>
                    <div className="space-y-6">
                      <div>
                        <label className="fancy-label">Target Calories</label>
                        <input
                          type="number"
                          name="target_calories"
                          value={preferences.target_calories}
                          onChange={handleInputChange}
                          className="fancy-input"
                        />
                      </div>
                      <div>
                        <label className="fancy-label">Target Protein (g)</label>
                        <input
                          type="number"
                          name="target_protein"
                          value={preferences.target_protein}
                          onChange={handleInputChange}
                          className="fancy-input"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end space-x-4">
                  <button type="submit" className="btn-primary" disabled={loading}>
                    {loading ? 'Generating...' : 'Generate Meal Plan'}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Meal Plan Tab */}
          {activeTab === 'meal-plan' && mealPlan && (
            <div className="space-y-8 animate-fade-in">
              {/* Macro Progress */}
              <div className="glass-effect rounded-2xl p-6">
                <h3 className="fancy-title text-2xl mb-6">Daily Progress</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <MacroProgressBar
                    label="Calories"
                    value={calculateTotalMacros().calories}
                    max={preferences.target_calories}
                    unit="kcal"
                  />
                  <MacroProgressBar
                    label="Protein"
                    value={calculateTotalMacros().protein}
                    max={preferences.target_protein}
                    unit="g"
                  />
                </div>
              </div>

              {/* Meal Sections */}
              {['breakfast', 'lunch', 'dinner'].map((mealType) => (
                <div key={mealType} className="glass-effect rounded-2xl p-6">
                  <h3 className="fancy-title text-2xl mb-6 capitalize">{mealType}</h3>
                  <div className="meal-grid">
                    {mealPlan[mealType as keyof MealPlan].map((meal) => (
                      <MealCard
                        key={meal.name}
                        meal={meal}
                        type={mealType as keyof MealSelection}
                        isSelected={selectedMeals[mealType as keyof MealSelection].some(
                          (m) => m.name === meal.name
                        )}
                      />
                    ))}
                  </div>
                </div>
              ))}

              <div className="flex justify-end space-x-4">
                <button onClick={handleClearSelections} className="btn-secondary">
                  Clear Selections
                </button>
                <button onClick={handleRegenerate} className="btn-primary" disabled={loading}>
                  {loading ? 'Regenerating...' : 'Regenerate Plan'}
                </button>
              </div>
            </div>
          )}
        </div>

        {error && (
          <div className="mt-4 p-4 bg-red-50 text-red-700 rounded-xl border border-red-100">
            <div className="flex items-center">
              <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
              {error}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default App
