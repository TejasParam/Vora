import { useState, useEffect } from 'react'
import axios from 'axios'
import { useAuth0 } from '@auth0/auth0-react'
import { particlesConfig } from './particlesConfig'

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

interface Rating {
  meal_name: string;
  rating: number;
  date: string;
}

interface RatingsData {
  all_ratings: Rating[];
  favorites: Rating[];
}

interface MenuScraperProps {
  onSuccess: (data: any) => void;
  onError: (error: string) => void;
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
  const [activeTab, setActiveTab] = useState<'chat' | 'preferences' | 'meal-plan' | 'ratings'>('chat')
  const [ratings, setRatings] = useState<RatingsData>({ all_ratings: [], favorites: [] })

  const { isAuthenticated, user, loginWithRedirect, logout, getAccessTokenSilently } = useAuth0()

  const getAuthHeaders = async () => {
    try {
      const token = await getAccessTokenSilently()
      return {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    } catch (error) {
      console.error('Error getting auth token:', error)
      return null
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!isAuthenticated) {
      setError('Please log in to generate a meal plan.')
      loginWithRedirect()
      return
    }

    setLoading(true)
    setError(null)
    setMealPlan(null)
    
    try {
      const headers = await getAuthHeaders()
      if (!headers) {
        throw new Error('Authentication failed. Please try logging in again.')
      }

      const response = await axios.post(
        '/api/get_meal_plan',
        preferences,
        { headers }
      )

      if (response.data.error) {
        throw new Error(response.data.error)
      }
      setMealPlan(response.data)
    } catch (err: any) {
      const errorMessage = err.response?.status === 401 
        ? 'Please log in to use this feature.'
        : err.response?.data?.error || err.message || 'Failed to fetch meal plan. Please try again.'
      
      setError(errorMessage)
      
      if (err.response?.status === 401) {
        loginWithRedirect()
      }
      
      console.error('Error fetching meal plan:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleChatSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!userInput.trim()) return

    if (!isAuthenticated) {
      setChatMessages(prev => [...prev, {
        type: 'assistant',
        content: 'Please log in to use the chat feature.'
      }])
      loginWithRedirect()
      return
    }

    // Add user message to chat
    const userMessage = { type: 'user' as const, content: userInput }
    setChatMessages(prev => [...prev, userMessage])
    setUserInput('')
    setLoading(true)
    setError(null)

    try {
      const headers = await getAuthHeaders()
      if (!headers) {
        throw new Error('Authentication failed. Please try logging in again.')
      }

      const response = await axios.post(
        '/api/chat',
        { message: userMessage.content },
        { headers }
      )

      if (response.data.error) {
        throw new Error(response.data.error)
      }

      // Add assistant response to chat
      setChatMessages(prev => [...prev, { type: 'assistant', content: response.data.message }])
      
      if (response.data.meal_plan) {
        setMealPlan(response.data.meal_plan)
        setPreferences(response.data.extracted_preferences)
        
        setChatMessages(prev => [...prev, {
          type: 'assistant',
          content: "I've generated a personalized meal plan based on your preferences! 🎉\n\nI'm switching you to the Meal Plan tab where you can:\n• View your recommended meals\n• Select meals you like\n• Track your nutritional progress\n• Regenerate the plan if needed\n\nFeel free to come back to chat if you need any adjustments!"
        }])
        
        setTimeout(() => {
          setActiveTab('meal-plan')
        }, 2000)
      }
    } catch (err: any) {
      const errorMessage = err.response?.status === 401 
        ? 'Please log in to use this feature.'
        : err.response?.data?.error || err.message || 'Failed to process your request. Please try again.'
      
      setError(errorMessage)
      setChatMessages(prev => [...prev, { 
        type: 'assistant', 
        content: `Error: ${errorMessage}` 
      }])
      
      if (err.response?.status === 401) {
        loginWithRedirect()
      }
      
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
      const response = await axios.post('/api/get_meal_plan', preferences)
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

  const MealCard = ({ meal, type, isSelected }: { meal: MealInfo; type: keyof MealSelection; isSelected: boolean }) => {
    const currentRating = ratings.all_ratings.find(r => r.meal_name === meal.name)?.rating || 0
    
    return (
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
        <div className="mt-4 pt-3 border-t border-gray-100">
          <p className="text-sm text-gray-600 mb-2">Rate this meal:</p>
          <RatingStars
            mealName={meal.name}
            currentRating={currentRating}
            onRate={(rating) => handleRating(meal.name, rating)}
          />
        </div>
      </div>
    );
  };

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

  const ChatMessage = ({ message }: { message: ChatMessage }) => (
    <div
      className={`chat-message ${
        message.type === 'user' ? 'chat-message-user' : 'chat-message-assistant'
      }`}
    >
      <pre className="whitespace-pre-wrap font-montserrat text-base">
        {message.content}
      </pre>
    </div>
  );

  const handleRating = async (mealName: string, rating: number) => {
    if (!isAuthenticated) {
      setError('Please log in to rate meals')
      loginWithRedirect()
      return
    }

    try {
      const token = await getAccessTokenSilently()
      const userId = user?.sub
      
      await axios.post(
        '/api/add_rating',
        { meal_name: mealName, rating },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'X-User-Id': userId
          }
        }
      )
      
      // Refresh ratings after adding a new one
      fetchUserRatings()
    } catch (err: any) {
      console.error('Error adding rating:', err)
      setError('Failed to add rating. Please try again.')
    }
  }

  const fetchUserRatings = async () => {
    if (!isAuthenticated) return

    try {
      const token = await getAccessTokenSilently()
      const userId = user?.sub
      
      const response = await axios.get('/api/get_user_ratings', {
        headers: {
          Authorization: `Bearer ${token}`,
          'X-User-Id': userId
        }
      })
      
      setRatings(response.data)
    } catch (err: any) {
      console.error('Error fetching ratings:', err)
      setError('Failed to fetch ratings. Please try again.')
    }
  }

  useEffect(() => {
    if (isAuthenticated) {
      fetchUserRatings()
    }
  }, [isAuthenticated])

  useEffect(() => {
    // Initialize particles.js
    const initParticles = async () => {
      const particlesJS = (window as any).particlesJS;
      if (particlesJS) {
        particlesJS('particles-js', particlesConfig);
      }
    };

    initParticles();
  }, []);

  const RatingStars = ({ mealName, currentRating = 0, onRate }: { mealName: string; currentRating?: number; onRate: (rating: number) => void }) => (
    <div className="flex items-center space-x-0.5">
      {[...Array(5)].map((_, index) => (
        <button
          key={index}
          onClick={() => onRate(index + 1)}
          className={`text-sm transition-colors ${
            index < currentRating ? 'text-yellow-400' : 'text-gray-300'
          } hover:text-yellow-500 focus:outline-none`}
          aria-label={`Rate ${index + 1} stars`}
        >
          ★
        </button>
      ))}
    </div>
  )

  const RatingsTab = () => (
    <div className="space-y-8">
      {/* Favorites Section */}
      <div className="glass-effect rounded-2xl p-6">
        <h3 className="fancy-title text-2xl mb-6">Your Favorites</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {ratings.favorites.map((favorite) => (
            <div key={`${favorite.meal_name}-${favorite.date}`} className="fancy-card">
              <h4 className="font-playfair text-xl font-semibold text-gray-800 mb-3">
                {favorite.meal_name}
              </h4>
              <div className="flex items-center justify-between">
                <div className="text-yellow-400 text-sm">{'★'.repeat(favorite.rating)}</div>
                <div className="text-sm text-gray-500">
                  {new Date(favorite.date).toLocaleDateString()}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* All Ratings Table */}
      <div className="glass-effect rounded-2xl p-6">
        <h3 className="fancy-title text-2xl mb-6">Rating History</h3>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead>
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Meal
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Rating
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {ratings.all_ratings.map((rating, index) => (
                <tr key={`${rating.meal_name}-${rating.date}`}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {rating.meal_name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-yellow-400">
                    <span className="text-sm">{'★'.repeat(rating.rating)}</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(rating.date).toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )

  const MenuScraper: React.FC<MenuScraperProps> = ({ onSuccess, onError }) => {
    const [url, setUrl] = useState('');
    const [loading, setLoading] = useState(false);
    const { getAccessTokenSilently } = useAuth0();

    const handleScrape = async (e: React.FormEvent) => {
      e.preventDefault();
      setLoading(true);

      try {
        const token = await getAccessTokenSilently();
        const response = await axios.post('/api/scrape_menu', 
          { url },
          { 
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          }
        );

        onSuccess(response.data.data);
      } catch (error: any) {
        onError(error.response?.data?.error || 'Failed to scrape menu');
      } finally {
        setLoading(false);
      }
    };

    return (
      <div className="glass-effect rounded-2xl p-6 mb-8">
        <h3 className="fancy-title text-2xl mb-4">Custom Menu Scraper</h3>
        <form onSubmit={handleScrape} className="space-y-4">
          <div>
            <label className="fancy-label">Dining Hall Menu URL</label>
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://dining.example.edu/menu"
              className="fancy-input w-full"
              required
            />
          </div>
          <button 
            type="submit" 
            className="btn-primary"
            disabled={loading}
          >
            {loading ? (
              <span className="flex items-center">
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Scraping Menu...
              </span>
            ) : (
              'Scrape Menu'
            )}
          </button>
        </form>
      </div>
    );
  };

  return (
    <div className="min-h-screen relative">
      {/* Particles container */}
      <div 
        id="particles-js" 
        className="absolute inset-0"
      />

      {/* Main content with higher z-index */}
      <div className="relative z-10">
        {/* Navigation Header */}
        <nav className="bg-white/80 backdrop-blur-sm shadow-sm">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-16">
              <div className="flex-shrink-0">
                <h1 className="text-4xl font-['Cormorant_Garamond'] font-bold text-gray-900" style={{ fontFamily: 'Cormorant Garamond, cursive' }}>Vora</h1>
              </div>
              <div className="flex items-center space-x-4">
                {!isAuthenticated ? (
                  <button
                    onClick={() => loginWithRedirect()}
                    className="btn-primary"
                  >
                    Log In
                  </button>
                ) : (
                  <div className="flex items-center gap-4">
                    <p className="text-gray-600">Welcome, {user?.name}</p>
                    <button
                      onClick={() => logout({ logoutParams: { returnTo: window.location.origin } })}
                      className="btn-secondary"
                    >
                      Log Out
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </nav>

        <div className="py-8 px-4 sm:px-6 lg:px-8">
          <div className="max-w-7xl mx-auto">
            {/* Tabs */}
            <div className="flex justify-center mb-8">
              <nav className="glass-effect rounded-2xl p-1.5 shadow-lg">
                {['chat', 'preferences', 'meal-plan', 'ratings'].map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab as typeof activeTab)}
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
                      <ChatMessage key={index} message={msg} />
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
                <>
                  <MenuScraper 
                    onSuccess={(data) => {
                      // Handle the scraped menu data
                      console.log('Scraped menu data:', data);
                      // You could update state here or trigger meal plan generation
                    }}
                    onError={(error) => setError(error)}
                  />
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
                </>
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

              {/* Ratings Tab */}
              {activeTab === 'ratings' && <RatingsTab />}
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
      </div>
    </div>
  )
}

export default App
