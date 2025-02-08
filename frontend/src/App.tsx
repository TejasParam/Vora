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
    setPreferences(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : Number(value)
    }))
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
          <span>{Math.round(value)}/{Math.round(max)}{unit}</span>
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
      className={`bg-white p-4 rounded-lg shadow-md hover:shadow-lg transition-shadow cursor-pointer border-2
        ${isSelected ? 'border-primary-500' : 'border-transparent'}`}
    >
      <h4 className="font-semibold text-lg text-gray-800">{meal.name}</h4>
      <div className="mt-2 space-y-1 text-sm text-gray-600">
        <p className="flex justify-between">
          <span>Calories:</span>
          <span className="font-medium">{meal.calories}</span>
        </p>
        <p className="flex justify-between">
          <span>Protein:</span>
          <span className="font-medium">{meal.protein}g</span>
        </p>
        <p className="flex justify-between">
          <span>Carbs:</span>
          <span className="font-medium">{meal.carbs}g</span>
        </p>
        <p className="flex justify-between">
          <span>Fat:</span>
          <span className="font-medium">{meal.fat}g</span>
        </p>
        <div className="mt-2 pt-2 border-t border-gray-200">
          <p className="text-xs text-gray-500">Dietary Info:</p>
          <p className="text-sm font-medium text-gray-700">{meal.dietary_restrictions}</p>
        </div>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-purple-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold text-green-800 mb-4">Vora Meal Planner</h1>
          <p className="text-xl text-gray-600">Your personal AI-powered nutrition assistant</p>
        </div>

        {/* Tabs */}
        <div className="flex justify-center mb-8">
          <nav className="flex space-x-4 bg-white rounded-lg p-1 shadow-md">
            <button
              onClick={() => setActiveTab('chat')}
              className={`px-4 py-2 rounded-lg transition-colors duration-200 ${
                activeTab === 'chat' ? 'bg-green-100 text-green-600' : 'text-gray-600 hover:text-green-600'
              }`}
            >
              Chat
            </button>
            <button
              onClick={() => setActiveTab('preferences')}
              className={`px-4 py-2 rounded-lg transition-colors duration-200 ${
                activeTab === 'preferences' ? 'bg-green-100 text-green-600' : 'text-gray-600 hover:text-green-600'
              }`}
            >
              Preferences
            </button>
            <button
              onClick={() => setActiveTab('meal-plan')}
              className={`px-4 py-2 rounded-lg transition-colors duration-200 ${
                activeTab === 'meal-plan' ? 'bg-green-100 text-green-600' : 'text-gray-600 hover:text-green-600'
              }`}
            >
              Meal Plan
            </button>
          </nav>
        </div>

        {/* Tab Content */}
        <div className="space-y-8">
          {/* Chat Tab */}
          {activeTab === 'chat' && (
            <div className="bg-white rounded-xl shadow-lg p-6">
              <div className="mb-6 max-h-[400px] overflow-y-auto">
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
                  className="input-field flex-grow"
                  disabled={loading}
                />
                <button type="submit" className="btn-primary" disabled={loading}>
                  {loading ? 'Processing...' : 'Send'}
                </button>
              </form>
            </div>
          )}

          {/* Preferences Tab */}
          {activeTab === 'preferences' && (
            <div className="bg-white rounded-xl shadow-lg p-6">
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-gray-900">Dietary Preferences</h3>
                    <div className="space-y-2">
                      {['vegan', 'vegetarian', 'gluten_free', 'halal'].map((pref) => (
                        <label key={pref} className="flex items-center space-x-3">
                          <input
                            type="checkbox"
                            name={pref}
                            checked={preferences[pref as keyof typeof preferences]}
                            onChange={handleInputChange}
                            className="form-checkbox h-5 w-5 text-indigo-600"
                          />
                          <span className="text-gray-700 capitalize">{pref.replace('_', ' ')}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-gray-900">Nutritional Goals</h3>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700">
                          Target Calories
                        </label>
                        <input
                          type="number"
                          name="target_calories"
                          value={preferences.target_calories}
                          onChange={handleInputChange}
                          className="input-field mt-1"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">
                          Target Protein (g)
                        </label>
                        <input
                          type="number"
                          name="target_protein"
                          value={preferences.target_protein}
                          onChange={handleInputChange}
                          className="input-field mt-1"
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
            <div className="space-y-8">
              {/* Macro Progress */}
              <div className="bg-white rounded-xl shadow-lg p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Daily Progress</h3>
                <div className="space-y-4">
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
                <div key={mealType} className="bg-white rounded-xl shadow-lg p-6">
                  <h3 className="text-xl font-semibold text-gray-900 capitalize mb-6">{mealType}</h3>
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
          <div className="mt-4 p-4 bg-red-50 text-red-700 rounded-lg">
            {error}
          </div>
        )}
      </div>
    </div>
  )
}

export default App
