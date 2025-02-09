from bs4 import BeautifulSoup
import requests
import pandas as pd
import re
from typing import Dict, List
import numpy as np
from datetime import datetime
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.chrome.options import Options
import time
from selenium.webdriver.common.action_chains import ActionChains
from selenium.webdriver.common.desired_capabilities import DesiredCapabilities

class UNCDiningScaper:
    def __init__(self):
        self.base_url = "https://dining.unc.edu/locations/top-of-lenoir"
        self.locations = {
            "lenoir": "?date=2025-02-10"
        }
        
    def set_url(self, url: str):
        """Update the base URL for scraping"""
        self.base_url = url
        
    def get_driver(self):
        chrome_options = Options()
        chrome_options.add_argument("--headless")  # Run in headless mode
        chrome_options.add_argument("--no-sandbox")
        chrome_options.add_argument("--disable-dev-shm-usage")
        chrome_options.add_argument("--window-size=1920,1080")
        return webdriver.Chrome(options=chrome_options)

    def get_nutrition_info(self, item_element, driver) -> Dict[str, float]:
        try:
            nutrition = {
                'Calories': 0.0,
                'Total Fat': 0.0,
                'Total Carbohydrates': 0.0,
                'Protein': 0.0,
                'Sodium': 0.0
            }
            
            # Scroll element into view and wait a moment
            driver.execute_script("arguments[0].scrollIntoView(true);", item_element)
            time.sleep(0.5)
            
            # Click using JavaScript
            show_nutrition_button = item_element.find_element(By.CLASS_NAME, "show-nutrition")
            driver.execute_script("arguments[0].click();", show_nutrition_button)
            
            # Wait for nutrition slider and table
            wait = WebDriverWait(driver, 10)
            wait.until(EC.visibility_of_element_located((By.ID, "nutrition-slider")))
            wait.until(EC.presence_of_element_located((By.CLASS_NAME, "nutrition-facts-table")))
            
            # Get the table HTML content
            table_html = driver.find_element(By.CLASS_NAME, "nutrition-facts-table").get_attribute('outerHTML')
            soup = BeautifulSoup(table_html, 'html.parser')
            rows = soup.find_all('tr')
            
            for row in rows:
                row_text = row.get_text(strip=True)
                
                if 'Calories' in row_text and 'from' not in row_text.lower():
                    calories_match = re.search(r'Calories\s*(\d+)', row_text)
                    if calories_match:
                        nutrition['Calories'] = float(calories_match.group(1))
                
                elif 'Total Fat' in row_text:
                    fat_match = re.search(r'Total Fat\s*(\d+(?:\.\d+)?)', row_text)
                    if fat_match:
                        nutrition['Total Fat'] = float(fat_match.group(1))
                
                elif 'Total Carbohydrate' in row_text:
                    carbs_match = re.search(r'Total Carbohydrate\s*(\d+(?:\.\d+)?)', row_text)
                    if carbs_match:
                        nutrition['Total Carbohydrates'] = float(carbs_match.group(1))
                
                elif 'Protein' in row_text:
                    protein_match = re.search(r'Protein\s*(\d+(?:\.\d+)?)', row_text)
                    if protein_match:
                        nutrition['Protein'] = float(protein_match.group(1))
                        
                elif 'Sodium' in row_text:
                    sodium_match = re.search(r'Sodium\s*(\d+(?:\.\d+)?)', row_text)
                    if sodium_match:
                        nutrition['Sodium'] = float(sodium_match.group(1))
            
            # Close the nutrition slider
            close_button = driver.find_element(By.CLASS_NAME, "close-nutrition")
            driver.execute_script("arguments[0].click();", close_button)
            time.sleep(0.5)
            
            return nutrition
            
        except Exception as e:
            return nutrition

    def scrape_menu(self):
        try:
            driver = self.get_driver()
            driver.get(self.base_url)
            time.sleep(5)
            
            menu_items = []
            menu_stations = driver.find_elements(By.CLASS_NAME, "menu-station")
            
            for station in menu_stations:
                try:
                    station_name = station.text.split('\n')[0].strip()
                    menu_items_elements = station.find_elements(By.CLASS_NAME, "menu-item-li")
                    
                    for item in menu_items_elements:
                        try:
                            item_text = item.text.strip()
                            if not item_text:
                                continue
                            
                            name = item_text.split('\n')[0].strip()
                            nutrition = self.get_nutrition_info(item, driver)
                            
                            link_classes = item.find_element(By.CLASS_NAME, "show-nutrition").get_attribute("class").lower()
                            restrictions = {
                                'Vegan': 'prop-vegan' in link_classes,
                                'Vegetarian': 'prop-vegetarian' in link_classes,
                                'Made Without Gluten': 'prop-made_without_gluten' in link_classes,
                                'Halal': 'prop-halal' in link_classes,
                                'Organic': 'prop-organic' in link_classes
                            }
                            
                            menu_items.append({
                                'Food Name': name,
                                'Location': 'Top of Lenoir',
                                'Section': station_name,
                                **nutrition,
                                **restrictions
                            })
                                
                        except Exception:
                            continue
                                
                except Exception:
                    continue
            
            if menu_items:
                df = pd.DataFrame(menu_items)
                numeric_columns = ['Calories', 'Total Fat', 'Total Carbohydrates', 'Protein', 'Sodium']
                for col in numeric_columns:
                    df[col] = pd.to_numeric(df[col], errors='coerce')
                
                df[numeric_columns] = df[numeric_columns].fillna(df[numeric_columns].mean())
                
                timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
                filename = f'lenoir_menu_{timestamp}.csv'
                df.to_csv(filename, index=False)
                return df
                
            return None
            
        except Exception:
            return None
        finally:
            driver.quit()

if __name__ == "__main__":
    scraper = UNCDiningScaper()
    scraper.scrape_menu() 