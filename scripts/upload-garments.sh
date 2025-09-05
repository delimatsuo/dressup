#!/bin/bash

# Script to upload sample garments via the uploadGarment Cloud Function
# Uses the deployed function URL

FUNCTION_URL="https://us-central1-project-friday-471118.cloudfunctions.net/uploadGarment"

echo "📦 Uploading sample garments to Firestore..."
echo ""

# Array of garment data
garments=(
  '{"name": "Classic White T-Shirt", "category": "tops", "description": "A versatile white cotton t-shirt", "imageUrl": "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=800"}'
  '{"name": "Blue Denim Jeans", "category": "bottoms", "description": "Classic straight-fit blue jeans", "imageUrl": "https://images.unsplash.com/photo-1542272604-787c3835535d?w=800"}'
  '{"name": "Little Black Dress", "category": "dresses", "description": "Elegant black dress for evening events", "imageUrl": "https://images.unsplash.com/photo-1566479179474-987a6f9c0c3e?w=800"}'
  '{"name": "Floral Summer Dress", "category": "dresses", "description": "Light floral pattern dress for summer", "imageUrl": "https://images.unsplash.com/photo-1572804013309-59a88b7e92f1?w=800"}'
  '{"name": "Navy Blazer", "category": "outerwear", "description": "Professional navy blue blazer", "imageUrl": "https://images.unsplash.com/photo-1594938298603-c8148c4dae35?w=800"}'
  '{"name": "Striped Button-Up Shirt", "category": "tops", "description": "Blue and white striped cotton shirt", "imageUrl": "https://images.unsplash.com/photo-1602810318383-e386cc2a3ccf?w=800"}'
  '{"name": "Black Leather Jacket", "category": "outerwear", "description": "Edgy black leather jacket", "imageUrl": "https://images.unsplash.com/photo-1551028719-00167b16eac5?w=800"}'
  '{"name": "Khaki Chinos", "category": "bottoms", "description": "Versatile khaki chino pants", "imageUrl": "https://images.unsplash.com/photo-1473966968600-fa801b869a1a?w=800"}'
  '{"name": "Red Cocktail Dress", "category": "dresses", "description": "Stunning red dress for parties", "imageUrl": "https://images.unsplash.com/photo-1595777457583-95e059d581b8?w=800"}'
  '{"name": "Denim Jacket", "category": "outerwear", "description": "Classic blue denim jacket", "imageUrl": "https://images.unsplash.com/photo-1576995853123-5a10305d93c0?w=800"}'
)

# Upload each garment
for garment in "${garments[@]}"; do
  name=$(echo $garment | jq -r '.name')
  echo "Uploading: $name"
  
  response=$(curl -s -X POST "$FUNCTION_URL" \
    -H "Content-Type: application/json" \
    -d "$garment")
  
  if echo "$response" | grep -q "success"; then
    echo "✅ Successfully uploaded: $name"
  else
    echo "❌ Failed to upload: $name"
    echo "Response: $response"
  fi
  
  echo ""
done

echo "✨ Done uploading sample garments!"