# Material Library UI/UX Standardization Plan

## Critical Uniformity Issues Found

### 1. **Search Interface Inconsistencies**
- **Steel Catalogue**: "Search materials..." 
- **Consumables**: "Search consumables..."
- **Coating Systems**: "Search coating systems, manufacturers, codes..."
- **Recommendation**: Standardize to "Search [category]..." format

### 2. **View Mode Terminology**
- **Steel Catalogue**: "card" / "list" 
- **Consumables**: "grid" / "table"
- **Coating Systems**: Table only (no toggle)
- **Recommendation**: Standardize to "grid" / "list" / "table" across all

### 3. **Category Navigation Styles**
- **Steel Catalogue**: Sidebar with expandable categories
- **Consumables**: Horizontal category cards
- **Coating Systems**: Grid of category cards
- **Recommendation**: Implement consistent card-based navigation

### 4. **Filter Interface Layout**
- **Steel Catalogue**: Integrated in header
- **Consumables**: Collapsible filter panel
- **Coating Systems**: Simple search + badge count
- **Recommendation**: Standardized collapsible filter system

### 5. **Performance & Loading**
- **Steel Catalogue**: Custom load more with 10 items
- **Consumables**: Load more with 10 items  
- **Coating Systems**: No pagination
- **Recommendation**: Consistent 15-item initial load + "Load More"

### 6. **Action Button Styles**
- **Steel Catalogue**: Various icon combinations
- **Consumables**: Shopping cart icons
- **Coating Systems**: Edit/Delete only
- **Recommendation**: Consistent action button set

## Proposed Standardization

### Visual Design Standards
```
1. **Card Layout**: 16px padding, rounded-lg, hover:shadow-md
2. **Badges**: Consistent color coding across categories
3. **Buttons**: Standard sizing (sm for actions, default for primary)
4. **Icons**: 4x4 sizing, consistent stroke width
5. **Typography**: font-medium for titles, text-sm for descriptions
```

### Functional Standards
```
1. **Search**: Debounced 300ms, min 2 characters
2. **Pagination**: 15 items initial, +15 on Load More
3. **Filters**: Collapsible panel, saved filter support
4. **View Modes**: Grid (cards) / List (compact) / Table (detailed)
5. **Loading States**: Skeleton loaders, 300ms delay
```

### Performance Standards
```
1. **Initial Load**: 15 most used/recent items
2. **Search Results**: Debounced, client-side filtering
3. **Category Switch**: Instant with cached data
4. **Export/Import**: Async with progress indicators
```

## Implementation Priority
1. **HIGH**: Search interface standardization
2. **HIGH**: View mode terminology alignment  
3. **MEDIUM**: Category navigation consistency
4. **MEDIUM**: Filter interface unification
5. **LOW**: Performance optimization alignment