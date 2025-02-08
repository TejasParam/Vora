import pandas as pd
import numpy as np
from flask import Flask, request, jsonify, render_template
from flask_cors import CORS
from sklearn.preprocessing import StandardScaler
from sklearn.metrics.pairwise import cosine_similarity
import re

app = Flask(__name__)
CORS(app)

# Load and preprocess the data
df = pd.read_csv('Data_prep.csv')

# Convert boolean columns to numeric and handle NaN values
boolean_columns = ['Vegan', 'Made Without Gluten', 'Vegetarian', 'Organic', 'Halal', 'Breakfast', 'Lunch', 'Dinner']
for col in boolean_columns:
    df[col] = df[col].map({'T': 1, 'F': 0, True: 1, False: 0}).fillna(0)

# Fill NaN values in numeric columns with mean
numeric_columns = ['Calories', 'Total Fat', 'Total Carbohydrates', 'Protein']
for col in numeric_columns:
    df[col] = df[col].fillna(df[col].mean())

# Create feature matrix for similarity calculation
feature_cols = ['Calories', 'Total Fat', 'Total Carbohydrates', 'Protein', 'Vegan', 
                'Made Without Gluten', 'Vegetarian', 'Organic', 'Halal']

# Initialize the scaler
features = df[feature_cols].values
scaler = StandardScaler()
features = scaler.fit_transform(features)

def extract_preferences_from_text(text):
    """Extract dietary preferences and restrictions from natural language input"""
    preferences = {
        'vegan': False,
        'vegetarian': False,
        'gluten_free': False,
        'halal': False,
        'target_calories': 2000,
        'target_protein': 50
    }
    
    # Convert text to lowercase for easier matching
    text = text.lower()
    
    # Check for dietary restrictions
    if any(word in text for word in ['vegan', 'plant-based', 'no animal']):
        preferences['vegan'] = True
        preferences['vegetarian'] = True
    
    if any(word in text for word in ['vegetarian', 'no meat']):
        preferences['vegetarian'] = True
    
    if any(word in text for word in ['gluten-free', 'gluten free', 'no gluten', 'celiac']):
        preferences['gluten_free'] = True
    
    if any(word in text for word in ['halal']):
        preferences['halal'] = True
    
    # Extract calorie targets
    calorie_match = re.search(r'(\d+)\s*(?:kcal|calories|cal)', text)
    if calorie_match:
        preferences['target_calories'] = int(calorie_match.group(1))
    
    # Extract protein targets
    protein_match = re.search(r'(\d+)\s*(?:g|grams)?\s*(?:of)?\s*protein', text)
    if protein_match:
        preferences['target_protein'] = int(protein_match.group(1))
    
    return preferences

def get_dietary_restrictions_text(food_item):
    """Get a formatted string of dietary restrictions for a food item"""
    restrictions = []
    if food_item['Vegan']:
        restrictions.append('Vegan')
    if food_item['Vegetarian']:
        restrictions.append('Vegetarian')
    if food_item['Made Without Gluten']:
        restrictions.append('Gluten-Free')
    if food_item['Halal']:
        restrictions.append('Halal')
    if food_item['Organic']:
        restrictions.append('Organic')
    return ', '.join(restrictions) if restrictions else 'None'

def generate_chat_response(preferences, meal_plan):
    """Generate a natural language response based on the preferences and meal plan"""
    response = "Based on your preferences, I've created a personalized meal plan for you.\n\n"
    
    # Add dietary restrictions summary
    restrictions = []
    if preferences['vegan']:
        restrictions.append("vegan")
    if preferences['vegetarian'] and not preferences['vegan']:
        restrictions.append("vegetarian")
    if preferences['gluten_free']:
        restrictions.append("gluten-free")
    if preferences['halal']:
        restrictions.append("halal")
    
    if restrictions:
        response += f"I've made sure all meals are {', '.join(restrictions)}. "
    
    response += f"The plan targets approximately {preferences['target_calories']} calories "
    response += f"and {preferences['target_protein']}g of protein per day.\n\n"
    
    # Add meal plan details
    for meal_type, meals in meal_plan.items():
        response += f"{meal_type.capitalize()}:\n"
        for meal in meals:
            response += f"- {meal['name']} ({meal['calories']} cal, {meal['protein']}g protein)\n"
        response += "\n"
    
    return response

def get_meal_recommendations(preferences):
    """Generate meal recommendations based on user preferences with strict dietary restriction filtering"""
    try:
        # Create user preference vector
        user_pref = np.zeros(len(feature_cols))
        
        # Set dietary restrictions
        dietary_mapping = {
            'vegan': 'Vegan',
            'gluten_free': 'Made Without Gluten',
            'vegetarian': 'Vegetarian',
            'halal': 'Halal'
        }
        
        # Create a mask for filtering based on dietary restrictions
        valid_items_mask = np.ones(len(df), dtype=bool)
        
        for pref_key, feature_key in dietary_mapping.items():
            if preferences.get(pref_key):
                user_pref[feature_cols.index(feature_key)] = 1
                # Strict filtering: only include items that match the dietary restriction
                valid_items_mask &= (df[feature_key] == 1)
                
                # If vegan is selected, also enforce vegetarian
                if pref_key == 'vegan':
                    valid_items_mask &= (df['Vegetarian'] == 1)
        
        # Set nutritional preferences with higher weights for dietary restrictions
        target_calories = float(preferences.get('target_calories', 2000)) / 3  # per meal
        target_protein = float(preferences.get('target_protein', 50)) / 3  # per meal
        
        # Set calorie and protein targets in the preference vector
        user_pref[feature_cols.index('Calories')] = target_calories
        user_pref[feature_cols.index('Protein')] = target_protein
        
        # Normalize user preferences
        user_pref_scaled = scaler.transform(user_pref.reshape(1, -1))[0]
        
        # Calculate similarity scores
        similarity_scores = cosine_similarity([user_pref_scaled], features)[0]
        
        # Apply dietary restrictions mask
        similarity_scores[~valid_items_mask] = -1
        
        # Get recommendations for each meal type
        meal_plan = {}
        for meal_type in ['Breakfast', 'Lunch', 'Dinner']:
            # Filter by meal type
            meal_mask = df[meal_type] == 1
            
            # Get top recommendations for each meal with some randomness
            meal_scores = similarity_scores.copy()
            meal_scores[~meal_mask] = -1
            
            # Add small random variation to scores to get different results each time
            valid_meals = meal_scores > -1
            meal_scores[valid_meals] += np.random.uniform(-0.1, 0.1, size=np.sum(valid_meals))
            
            # Get indices of top matches that satisfy all constraints
            top_indices = np.argsort(meal_scores)[-5:][::-1]  # Get top 5
            recommendations = []
            
            # Use all 5 top matches instead of randomly selecting 3
            for idx in top_indices:
                if meal_scores[idx] > -1:  # Only include valid recommendations
                    food_item = df.iloc[idx]
                    recommendations.append({
                        'name': str(food_item['Food Name']),
                        'calories': float(food_item['Calories']),
                        'protein': float(food_item['Protein']),
                        'carbs': float(food_item['Total Carbohydrates']),
                        'fat': float(food_item['Total Fat']),
                        'dietary_restrictions': get_dietary_restrictions_text(food_item)
                    })
            
            meal_plan[meal_type.lower()] = recommendations
        
        return meal_plan
    except Exception as e:
        print(f"Error in get_meal_recommendations: {str(e)}")
        return None

@app.route('/')
def home():
    return render_template('index.html')

@app.route('/get_meal_plan', methods=['POST'])
def get_meal_plan():
    try:
        data = request.json
        preferences = {
            'vegan': data.get('vegan', False),
            'vegetarian': data.get('vegetarian', False),
            'gluten_free': data.get('gluten_free', False),
            'halal': data.get('halal', False),
            'target_calories': float(data.get('target_calories', 2000)),
            'target_protein': float(data.get('target_protein', 50))
        }
        
        meal_plan = get_meal_recommendations(preferences)
        if meal_plan is None:
            return jsonify({'error': 'Failed to generate meal plan'}), 500
            
        return jsonify(meal_plan)
    except Exception as e:
        print(f"Error in get_meal_plan: {str(e)}")
        return jsonify({'error': str(e)}), 500

@app.route('/chat', methods=['POST'])
def chat():
    try:
        data = request.json
        user_message = data.get('message', '')
        
        # Extract preferences from the user's message
        preferences = extract_preferences_from_text(user_message)
        
        # Generate meal plan based on extracted preferences
        meal_plan = get_meal_recommendations(preferences)
        if meal_plan is None:
            return jsonify({'error': 'Failed to generate meal plan'}), 500
        
        # Generate natural language response
        response = generate_chat_response(preferences, meal_plan)
        
        return jsonify({
            'message': response,
            'meal_plan': meal_plan,
            'extracted_preferences': preferences
        })
        
    except Exception as e:
        print(f"Error in chat endpoint: {str(e)}")
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=8000, debug=True)
