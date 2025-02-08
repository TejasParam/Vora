# Smart Meal Planner

An AI-powered meal planning system that suggests personalized meal plans based on your dietary preferences and nutritional goals.

## Features

- Personalized meal recommendations based on dietary restrictions
- Support for various dietary preferences (vegan, vegetarian, gluten-free, halal)
- Customizable calorie and protein targets
- Three meals per day (breakfast, lunch, dinner)
- Nutritional information for each recommended meal

## Setup

1. Install the required dependencies:
```bash
pip install -r requirements.txt
```

2. Make sure you have the `Data_prep.csv` file in the root directory.

3. Run the Flask application:
```bash
python backend.py
```

4. Open your web browser and navigate to `http://localhost:5000`

## Usage

1. Fill out the preferences form with your dietary restrictions and nutritional goals
2. Click "Get Meal Plan" to receive personalized meal recommendations
3. View your recommended meals for breakfast, lunch, and dinner, along with their nutritional information

## Technical Details

The system uses:
- Flask for the backend API
- Pandas for data processing
- Scikit-learn for recommendation algorithms
- Bootstrap for the frontend UI

The meal recommendations are generated using cosine similarity between user preferences and available meals, taking into account dietary restrictions and nutritional goals.
