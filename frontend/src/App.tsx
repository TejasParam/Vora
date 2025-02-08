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

function App() {
  const [preferences, setPreferences] = useState({
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
      [name]: type === 'checkbox' ? checked : parseFloat(value)
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
    <div className="min-h-screen bg-gradient-to-br from-primary-50 to-primary-100 py-6 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Smart Meal Planner</h1>
          <p className="text-lg text-gray-600">Get personalized meal recommendations based on your preferences</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Chat Interface */}
          <div className="bg-white rounded-xl shadow-xl overflow-hidden">
            <div className="p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Chat with AI Assistant</h2>
              <div className="h-96 overflow-y-auto mb-4 space-y-4 p-4 bg-gray-50 rounded-lg">
                {chatMessages.map((message, index) => (
                  <div
                    key={index}
                    className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[80%] rounded-lg p-3 ${
                        message.type === 'user'
                          ? 'bg-primary-500 text-white'
                          : 'bg-gray-200 text-gray-800'
                      }`}
                    >
                      <p className="whitespace-pre-wrap">{message.content}</p>
                    </div>
                  </div>
                ))}
              </div>
              <form onSubmit={handleChatSubmit} className="flex gap-2">
                <input
                  type="text"
                  value={userInput}
                  onChange={(e) => setUserInput(e.target.value)}
                  placeholder="Describe your dietary preferences and goals..."
                  className="flex-1 rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                  disabled={loading}
                />
                <button
                  type="submit"
                  disabled={loading}
                  className={`px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white 
                    ${loading ? 'bg-gray-400' : 'bg-primary-600 hover:bg-primary-700'} 
                    focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500`}
                >
                  Send
                </button>
              </form>
            </div>
          </div>

          {/* Form Interface */}
          <div className="bg-white rounded-xl shadow-xl overflow-hidden">
            <div className="p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Manual Preferences</h2>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-4">
                  <h3 className="text-lg font-medium text-gray-900">Dietary Restrictions</h3>
                  <div className="space-y-3">
                    {['vegan', 'vegetarian', 'gluten_free', 'halal'].map((pref) => (
                      <div key={pref} className="flex items-center">
                        <input
                          type="checkbox"
                          id={pref}
                          name={pref}
                          checked={preferences[pref as keyof typeof preferences] as boolean}
                          onChange={handleInputChange}
                          className="h-5 w-5 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                        />
                        <label htmlFor={pref} className="ml-3 text-gray-700 font-medium capitalize">
                          {pref.replace('_', ' ')}
                        </label>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="text-lg font-medium text-gray-900">Nutritional Goals</h3>
                  <div>
                    <label htmlFor="target_calories" className="block text-sm font-medium text-gray-700">
                      Target Daily Calories
                    </label>
                    <input
                      type="number"
                      name="target_calories"
                      id="target_calories"
                      value={preferences.target_calories}
                      onChange={handleInputChange}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                    />
                  </div>

                  <div>
                    <label htmlFor="target_protein" className="block text-sm font-medium text-gray-700">
                      Target Daily Protein (g)
                    </label>
                    <input
                      type="number"
                      name="target_protein"
                      id="target_protein"
                      value={preferences.target_protein}
                      onChange={handleInputChange}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className={`w-full px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white 
                    ${loading ? 'bg-gray-400' : 'bg-primary-600 hover:bg-primary-700'} 
                    focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500`}
                >
                  Generate Plan
                </button>
              </form>
            </div>
          </div>
        </div>

        {error && (
          <div className="mt-6 rounded-md bg-red-50 p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">{error}</h3>
              </div>
            </div>
          </div>
        )}

        {mealPlan && (
          <div className="mt-8 space-y-8">
            {/* Progress Bars */}
            <div className="bg-white rounded-xl shadow-xl p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-bold text-gray-900">Daily Nutrition Progress</h2>
                <button
                  onClick={handleClearSelections}
                  className="px-4 py-2 text-sm font-medium text-red-600 hover:text-red-700 
                    border border-red-600 hover:border-red-700 rounded-md transition-colors
                    focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                >
                  Clear All Selections
                </button>
              </div>
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
                <MacroProgressBar 
                  label="Carbs" 
                  value={calculateTotalMacros().carbs} 
                  max={preferences.target_calories * 0.5 / 4}
                  unit="g"
                />
                <MacroProgressBar 
                  label="Fat" 
                  value={calculateTotalMacros().fat} 
                  max={preferences.target_calories * 0.3 / 9}
                  unit="g"
                />
              </div>
            </div>

            {/* Meal Selection */}
            <div className="bg-white rounded-xl shadow-xl p-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Select Your Meals</h2>
              <div className="space-y-8">
                {Object.entries(mealPlan).map(([mealType, meals]) => (
                  <div key={mealType}>
                    <h3 className="text-xl font-semibold text-gray-900 capitalize mb-4">
                      {mealType} ({selectedMeals[mealType as keyof MealSelection].length} selected)
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
                      {meals.map((meal: MealInfo, index: number) => (
                        <MealCard 
                          key={index} 
                          meal={meal} 
                          type={mealType as keyof MealSelection}
                          isSelected={selectedMeals[mealType as keyof MealSelection]
                            .some(m => m.name === meal.name)}
                        />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default App
