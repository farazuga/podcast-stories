/**
 * Calendar Widget Enhancement
 * Enhances HTML5 date inputs with year-aware calendar functionality
 * that can display years in calendar but process dates without years for filtering
 */

class CalendarWidget {
    constructor() {
        this.currentYear = new Date().getFullYear();
        this.currentMonth = new Date().getMonth();
        this.activeInput = null;
        this.showYearInDisplay = true;
        this.callback = null;
    }

    /**
     * Initialize calendar widget for specified date inputs
     * @param {string} inputId - ID of the date input element
     * @param {Object} options - Configuration options
     */
    init(inputId, options = {}) {
        const input = document.getElementById(inputId);
        if (!input) {
            console.error(`Calendar widget: Input ${inputId} not found`);
            return;
        }

        // Store options
        input.calendarOptions = {
            showYearInForm: options.showYearInForm !== false, // default true
            stripYearFromValue: options.stripYearFromValue === true, // default false
            currentYearDefault: options.currentYearDefault === true, // default false
            ...options
        };

        // Add calendar enhancement
        this.enhanceInput(input);
    }

    /**
     * Enhance a date input with calendar functionality
     * @param {HTMLElement} input - The input element to enhance
     */
    enhanceInput(input) {
        // Create wrapper div
        const wrapper = document.createElement('div');
        wrapper.className = 'calendar-input-wrapper';
        
        // Insert wrapper before input and move input inside
        input.parentNode.insertBefore(wrapper, input);
        wrapper.appendChild(input);

        // Add calendar button
        const calendarBtn = document.createElement('button');
        calendarBtn.type = 'button';
        calendarBtn.className = 'calendar-btn';
        calendarBtn.innerHTML = '📅';
        calendarBtn.setAttribute('aria-label', 'Open calendar');
        
        wrapper.appendChild(calendarBtn);

        // Add event listeners
        calendarBtn.addEventListener('click', (e) => {
            e.preventDefault();
            this.showCalendar(input);
        });

        // Handle input changes
        input.addEventListener('change', () => {
            this.handleInputChange(input);
        });

        // Set initial value if needed
        if (input.value) {
            this.handleInputChange(input);
        }
    }

    /**
     * Show calendar popup for given input
     * @param {HTMLElement} input - The input element
     */
    showCalendar(input) {
        this.activeInput = input;
        
        // Remove existing calendar if any
        const existingCalendar = document.querySelector('.calendar-popup');
        if (existingCalendar) {
            existingCalendar.remove();
        }

        // Create calendar popup
        const calendar = this.createCalendar();
        document.body.appendChild(calendar);

        // Position calendar
        this.positionCalendar(calendar, input);

        // Add click outside to close
        setTimeout(() => {
            document.addEventListener('click', this.handleClickOutside.bind(this), true);
        }, 100);
    }

    /**
     * Create calendar HTML structure
     * @returns {HTMLElement} Calendar element
     */
    createCalendar() {
        const calendar = document.createElement('div');
        calendar.className = 'calendar-popup';
        
        // Set initial date
        const inputValue = this.activeInput.value;
        if (inputValue) {
            const date = new Date(inputValue + 'T00:00:00');
            this.currentYear = date.getFullYear();
            this.currentMonth = date.getMonth();
        }

        calendar.innerHTML = this.getCalendarHTML();
        
        // Add event listeners
        this.addCalendarEventListeners(calendar);
        
        return calendar;
    }

    /**
     * Generate calendar HTML
     * @returns {string} Calendar HTML
     */
    getCalendarHTML() {
        const monthNames = [
            'January', 'February', 'March', 'April', 'May', 'June',
            'July', 'August', 'September', 'October', 'November', 'December'
        ];

        const daysInMonth = new Date(this.currentYear, this.currentMonth + 1, 0).getDate();
        const firstDay = new Date(this.currentYear, this.currentMonth, 1).getDay();
        
        let html = `
            <div class="calendar-header">
                <button type="button" class="calendar-nav" data-action="prev-month">‹</button>
                <div class="calendar-title">
                    <select class="calendar-month-select">
                        ${monthNames.map((name, index) => 
                            `<option value="${index}" ${index === this.currentMonth ? 'selected' : ''}>${name}</option>`
                        ).join('')}
                    </select>
                    <select class="calendar-year-select">
                        ${this.generateYearOptions()}
                    </select>
                </div>
                <button type="button" class="calendar-nav" data-action="next-month">›</button>
            </div>
            <div class="calendar-weekdays">
                <div>Su</div><div>Mo</div><div>Tu</div><div>We</div><div>Th</div><div>Fr</div><div>Sa</div>
            </div>
            <div class="calendar-days">
        `;

        // Add empty cells for days before the first day of the month
        for (let i = 0; i < firstDay; i++) {
            html += '<div class="calendar-day empty"></div>';
        }

        // Add days of the month
        for (let day = 1; day <= daysInMonth; day++) {
            const dateStr = `${this.currentYear}-${String(this.currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            const isSelected = this.activeInput.value === dateStr;
            const isToday = this.isToday(this.currentYear, this.currentMonth, day);
            
            html += `<div class="calendar-day ${isSelected ? 'selected' : ''} ${isToday ? 'today' : ''}" 
                         data-date="${dateStr}">${day}</div>`;
        }

        html += `
            </div>
            <div class="calendar-footer">
                <button type="button" class="calendar-btn-today">Today</button>
                <button type="button" class="calendar-btn-clear">Clear</button>
                <button type="button" class="calendar-btn-close">Close</button>
            </div>
        `;

        return html;
    }

    /**
     * Generate year options for the year selector
     * @returns {string} Year options HTML
     */
    generateYearOptions() {
        const currentYear = new Date().getFullYear();
        const startYear = currentYear - 10;
        const endYear = currentYear + 10;
        
        let options = '';
        for (let year = startYear; year <= endYear; year++) {
            const selected = year === this.currentYear ? 'selected' : '';
            options += `<option value="${year}" ${selected}>${year}</option>`;
        }
        return options;
    }

    /**
     * Check if a date is today
     * @param {number} year - Year
     * @param {number} month - Month (0-based)
     * @param {number} day - Day
     * @returns {boolean} True if today
     */
    isToday(year, month, day) {
        const today = new Date();
        return year === today.getFullYear() && 
               month === today.getMonth() && 
               day === today.getDate();
    }

    /**
     * Add event listeners to calendar
     * @param {HTMLElement} calendar - Calendar element
     */
    addCalendarEventListeners(calendar) {
        // Month/year navigation
        calendar.addEventListener('click', (e) => {
            if (e.target.matches('.calendar-nav[data-action="prev-month"]')) {
                this.navigateMonth(-1);
            } else if (e.target.matches('.calendar-nav[data-action="next-month"]')) {
                this.navigateMonth(1);
            } else if (e.target.matches('.calendar-day:not(.empty)')) {
                this.selectDate(e.target.dataset.date);
            } else if (e.target.matches('.calendar-btn-today')) {
                this.selectToday();
            } else if (e.target.matches('.calendar-btn-clear')) {
                this.clearDate();
            } else if (e.target.matches('.calendar-btn-close')) {
                this.closeCalendar();
            }
        });

        // Month/year select changes
        const monthSelect = calendar.querySelector('.calendar-month-select');
        const yearSelect = calendar.querySelector('.calendar-year-select');
        
        monthSelect.addEventListener('change', () => {
            this.currentMonth = parseInt(monthSelect.value);
            this.updateCalendar();
        });

        yearSelect.addEventListener('change', () => {
            this.currentYear = parseInt(yearSelect.value);
            this.updateCalendar();
        });
    }

    /**
     * Navigate to previous/next month
     * @param {number} direction - -1 for previous, 1 for next
     */
    navigateMonth(direction) {
        this.currentMonth += direction;
        
        if (this.currentMonth < 0) {
            this.currentMonth = 11;
            this.currentYear--;
        } else if (this.currentMonth > 11) {
            this.currentMonth = 0;
            this.currentYear++;
        }
        
        this.updateCalendar();
    }

    /**
     * Update calendar display
     */
    updateCalendar() {
        const calendar = document.querySelector('.calendar-popup');
        if (calendar) {
            calendar.innerHTML = this.getCalendarHTML();
            this.addCalendarEventListeners(calendar);
        }
    }

    /**
     * Select a date
     * @param {string} dateStr - Date in YYYY-MM-DD format
     */
    selectDate(dateStr) {
        const options = this.activeInput.calendarOptions;
        
        if (options.stripYearFromValue) {
            // For filters that want year-less values, store full date but show without year
            const dateParts = dateStr.split('-');
            const monthDay = `${dateParts[1]}/${dateParts[2]}`;
            this.activeInput.value = dateStr; // Store full date for API
            this.activeInput.dataset.displayValue = monthDay; // Store display value
            
            // Update input's visual appearance if needed
            if (this.activeInput.placeholder) {
                this.activeInput.placeholder = `Selected: ${monthDay}`;
            }
        } else {
            this.activeInput.value = dateStr;
        }

        // Trigger change event
        this.activeInput.dispatchEvent(new Event('change'));
        
        // Close calendar
        this.closeCalendar();
    }

    /**
     * Select today's date
     */
    selectToday() {
        const today = new Date();
        const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
        this.selectDate(todayStr);
    }

    /**
     * Clear the date
     */
    clearDate() {
        this.activeInput.value = '';
        this.activeInput.dataset.displayValue = '';
        if (this.activeInput.placeholder && this.activeInput.placeholder.startsWith('Selected:')) {
            this.activeInput.placeholder = '';
        }
        this.activeInput.dispatchEvent(new Event('change'));
        this.closeCalendar();
    }

    /**
     * Close calendar popup
     */
    closeCalendar() {
        const calendar = document.querySelector('.calendar-popup');
        if (calendar) {
            calendar.remove();
        }
        document.removeEventListener('click', this.handleClickOutside, true);
        this.activeInput = null;
    }

    /**
     * Handle clicks outside calendar
     * @param {Event} e - Click event
     */
    handleClickOutside(e) {
        const calendar = document.querySelector('.calendar-popup');
        if (calendar && !calendar.contains(e.target) && !e.target.matches('.calendar-btn')) {
            this.closeCalendar();
        }
    }

    /**
     * Position calendar relative to input
     * @param {HTMLElement} calendar - Calendar element
     * @param {HTMLElement} input - Input element
     */
    positionCalendar(calendar, input) {
        const rect = input.getBoundingClientRect();
        const calendarRect = calendar.getBoundingClientRect();
        
        let top = rect.bottom + window.scrollY + 5;
        let left = rect.left + window.scrollX;
        
        // Adjust if calendar would go off screen
        if (left + calendarRect.width > window.innerWidth) {
            left = window.innerWidth - calendarRect.width - 10;
        }
        
        if (top + calendarRect.height > window.innerHeight + window.scrollY) {
            top = rect.top + window.scrollY - calendarRect.height - 5;
        }
        
        calendar.style.position = 'absolute';
        calendar.style.top = `${top}px`;
        calendar.style.left = `${left}px`;
        calendar.style.zIndex = '1000';
    }

    /**
     * Handle input value changes
     * @param {HTMLElement} input - Input element
     */
    handleInputChange(input) {
        const options = input.calendarOptions;
        if (options && options.stripYearFromValue && input.value) {
            // Update display placeholder if needed
            const dateParts = input.value.split('-');
            if (dateParts.length === 3) {
                const monthDay = `${dateParts[1]}/${dateParts[2]}`;
                input.dataset.displayValue = monthDay;
            }
        }
    }
}

// Create global instance
window.CalendarWidget = new CalendarWidget();

// Auto-initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        window.CalendarWidget.initialized = true;
    });
} else {
    window.CalendarWidget.initialized = true;
}