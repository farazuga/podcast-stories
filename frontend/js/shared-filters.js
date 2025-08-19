// Shared Filter Components for VidPOD
// Reusable filtering functionality for stories across different pages

/**
 * StoryFilters - Reusable filter components for story data
 */
class StoryFilters {
    
    /**
     * Apply text search filter to stories
     * @param {Array} stories - Array of story objects
     * @param {string} searchTerm - Text to search for
     * @param {Array} fields - Fields to search in (e.g., ['idea_title', 'idea_description'])
     * @returns {Array} Filtered stories
     */
    static applyTextFilter(stories, searchTerm, fields = ['idea_title', 'idea_description']) {
        if (!searchTerm || searchTerm.trim() === '') return stories;
        
        const lowerSearchTerm = searchTerm.toLowerCase();
        return stories.filter(story => {
            return fields.some(field => {
                const fieldValue = story[field];
                return fieldValue && fieldValue.toLowerCase().includes(lowerSearchTerm);
            });
        });
    }

    /**
     * Apply tags filter to stories
     * @param {Array} stories - Array of story objects
     * @param {Array} selectedTags - Array of selected tag names
     * @returns {Array} Filtered stories
     */
    static applyTagsFilter(stories, selectedTags) {
        if (!selectedTags || selectedTags.length === 0 || 
            (selectedTags.length === 1 && selectedTags[0] === '')) {
            return stories;
        }
        
        return stories.filter(story => {
            if (!story.tags || story.tags.length === 0) return false;
            return selectedTags.some(tag => story.tags.includes(tag));
        });
    }

    /**
     * Apply date range filter to stories
     * @param {Array} stories - Array of story objects
     * @param {string} startDate - Start date (YYYY-MM-DD)
     * @param {string} endDate - End date (YYYY-MM-DD)
     * @param {string} dateField - Field name to filter on (default: 'coverage_start_date')
     * @returns {Array} Filtered stories
     */
    static applyDateRangeFilter(stories, startDate, endDate, dateField = 'coverage_start_date') {
        let filtered = stories;

        if (startDate) {
            filtered = filtered.filter(story => {
                const storyDate = story[dateField];
                return storyDate && new Date(storyDate) >= new Date(startDate);
            });
        }

        if (endDate) {
            const endDateField = dateField === 'coverage_start_date' ? 'coverage_end_date' : dateField;
            filtered = filtered.filter(story => {
                const storyEndDate = story[endDateField] || story[dateField];
                return storyEndDate && new Date(storyEndDate) <= new Date(endDate);
            });
        }

        return filtered;
    }

    /**
     * Apply interviewee/people filter to stories
     * @param {Array} stories - Array of story objects
     * @param {string} searchTerm - Name to search for
     * @returns {Array} Filtered stories
     */
    static applyIntervieweeFilter(stories, searchTerm) {
        if (!searchTerm || searchTerm.trim() === '') return stories;
        
        const lowerSearchTerm = searchTerm.toLowerCase();
        return stories.filter(story => {
            if (!story.interviewees || story.interviewees.length === 0) return false;
            return story.interviewees.some(person => 
                person && person.toLowerCase().includes(lowerSearchTerm)
            );
        });
    }

    /**
     * Apply author filter to stories
     * @param {Array} stories - Array of story objects
     * @param {string} searchTerm - Author name/email to search for
     * @returns {Array} Filtered stories
     */
    static applyAuthorFilter(stories, searchTerm) {
        if (!searchTerm || searchTerm.trim() === '') return stories;
        
        const lowerSearchTerm = searchTerm.toLowerCase();
        return stories.filter(story => {
            const authorName = story.uploaded_by_name || '';
            const authorEmail = story.uploaded_by_email || '';
            return authorName.toLowerCase().includes(lowerSearchTerm) ||
                   authorEmail.toLowerCase().includes(lowerSearchTerm);
        });
    }

    /**
     * Apply status filter to stories (for approval workflow)
     * @param {Array} stories - Array of story objects  
     * @param {string} status - Status to filter by
     * @returns {Array} Filtered stories
     */
    static applyStatusFilter(stories, status) {
        if (!status || status === '') return stories;
        return stories.filter(story => story.approval_status === status);
    }

    /**
     * Apply sorting to stories
     * @param {Array} stories - Array of story objects
     * @param {string} sortBy - Sort criteria
     * @returns {Array} Sorted stories
     */
    static applySorting(stories, sortBy) {
        const sortedStories = [...stories];

        switch (sortBy) {
            case 'newest':
                return sortedStories.sort((a, b) => new Date(b.uploaded_date) - new Date(a.uploaded_date));
            case 'oldest':
                return sortedStories.sort((a, b) => new Date(a.uploaded_date) - new Date(b.uploaded_date));
            case 'title':
                return sortedStories.sort((a, b) => a.idea_title.localeCompare(b.idea_title));
            case 'author':
                return sortedStories.sort((a, b) => {
                    const authorA = a.uploaded_by_name || a.uploaded_by_email || '';
                    const authorB = b.uploaded_by_name || b.uploaded_by_email || '';
                    return authorA.localeCompare(authorB);
                });
            case 'submitted_newest':
                return sortedStories.sort((a, b) => new Date(b.submitted_at) - new Date(a.submitted_at));
            case 'submitted_oldest':
                return sortedStories.sort((a, b) => new Date(a.submitted_at) - new Date(b.submitted_at));
            default:
                return sortedStories;
        }
    }

    /**
     * Build filter object from form inputs
     * @param {string} containerId - Container ID with filter form
     * @returns {Object} Filter configuration object
     */
    static buildFiltersFromForm(containerId) {
        const container = document.getElementById(containerId) || document;
        
        // Get form values with fallbacks
        const getValue = (id, defaultValue = '') => {
            const element = container.querySelector(`#${id}`);
            return element ? element.value : defaultValue;
        };
        
        const getSelectedOptions = (id) => {
            const select = container.querySelector(`#${id}`);
            if (!select) return [];
            return Array.from(select.selectedOptions).map(opt => opt.value).filter(val => val !== '');
        };

        return {
            keywords: getValue('searchKeywords'),
            tags: getSelectedOptions('searchTags'),
            startDate: getValue('searchStartDate'),
            endDate: getValue('searchEndDate'),
            interviewee: getValue('searchInterviewee'),
            author: getValue('searchAuthor'),
            status: getValue('searchStatus'),
            sortBy: getValue('sortBy', 'newest')
        };
    }

    /**
     * Apply all filters to stories based on filter configuration
     * @param {Array} stories - Array of story objects
     * @param {Object} filters - Filter configuration object
     * @returns {Array} Filtered and sorted stories
     */
    static applyAllFilters(stories, filters) {
        let filtered = stories;

        // Apply each filter type
        if (filters.keywords) {
            filtered = this.applyTextFilter(filtered, filters.keywords);
        }

        if (filters.tags && filters.tags.length > 0) {
            filtered = this.applyTagsFilter(filtered, filters.tags);
        }

        if (filters.startDate || filters.endDate) {
            filtered = this.applyDateRangeFilter(filtered, filters.startDate, filters.endDate);
        }

        if (filters.interviewee) {
            filtered = this.applyIntervieweeFilter(filtered, filters.interviewee);
        }

        if (filters.author) {
            filtered = this.applyAuthorFilter(filtered, filters.author);
        }

        if (filters.status) {
            filtered = this.applyStatusFilter(filtered, filters.status);
        }

        // Apply sorting
        if (filters.sortBy) {
            filtered = this.applySorting(filtered, filters.sortBy);
        }

        return filtered;
    }

    /**
     * Update results count display
     * @param {string} containerId - Container element ID
     * @param {number} filteredCount - Number of filtered results
     * @param {number} totalCount - Total number of items
     * @param {string} itemType - Type of items (e.g., 'stories')
     */
    static updateResultsCount(containerId, filteredCount, totalCount, itemType = 'stories') {
        const container = document.getElementById(containerId);
        if (!container) return;

        let text;
        if (filteredCount === totalCount) {
            text = `Showing all ${totalCount} ${itemType}`;
        } else {
            text = `Showing ${filteredCount} of ${totalCount} ${itemType}`;
        }
        
        container.textContent = text;
    }

    /**
     * Clear all filter inputs in a container
     * @param {string} containerId - Container ID with filter inputs
     */
    static clearAllFilters(containerId) {
        const container = document.getElementById(containerId) || document;
        
        // Clear text inputs
        const textInputs = container.querySelectorAll('input[type="text"], input[type="search"], input[type="date"]');
        textInputs.forEach(input => input.value = '');
        
        // Reset selects
        const selects = container.querySelectorAll('select');
        selects.forEach(select => {
            if (select.multiple) {
                Array.from(select.options).forEach(option => option.selected = false);
                // Select first option if it's a placeholder
                if (select.options.length > 0 && select.options[0].value === '') {
                    select.options[0].selected = true;
                }
            } else {
                select.selectedIndex = 0;
            }
        });
    }

    /**
     * Setup tags dropdown with available tags
     * @param {string} selectId - Select element ID
     * @param {Array} tags - Array of tag objects {tag_name: string}
     * @param {string} placeholder - Placeholder option text
     */
    static setupTagsDropdown(selectId, tags, placeholder = 'All Tags') {
        const select = document.getElementById(selectId);
        if (!select) return;
        
        // Clear existing options
        select.innerHTML = `<option value="">${placeholder}</option>`;
        
        // Add tag options
        tags.forEach(tag => {
            const option = document.createElement('option');
            option.value = tag.tag_name;
            option.textContent = tag.tag_name;
            select.appendChild(option);
        });
    }

    /**
     * Setup event listeners for filter form
     * @param {string} formId - Form element ID
     * @param {function} onFilterChange - Callback function when filters change
     * @param {function} onClearFilters - Callback function when filters are cleared
     */
    static setupFilterEventListeners(formId, onFilterChange, onClearFilters) {
        const form = document.getElementById(formId);
        if (!form) return;

        // Form submit event
        form.addEventListener('submit', (e) => {
            e.preventDefault();
            if (onFilterChange) onFilterChange();
        });

        // Input change events for real-time filtering
        const inputs = form.querySelectorAll('input, select');
        inputs.forEach(input => {
            const eventType = input.type === 'text' || input.type === 'search' ? 'input' : 'change';
            input.addEventListener(eventType, () => {
                if (onFilterChange) onFilterChange();
            });
        });

        // Clear filters button
        const clearBtn = form.querySelector('[data-action="clear-filters"]');
        if (clearBtn) {
            clearBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.clearAllFilters(formId);
                if (onClearFilters) onClearFilters();
            });
        }
    }
}

// Make class globally available
window.StoryFilters = StoryFilters;