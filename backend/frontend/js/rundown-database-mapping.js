/**
 * VidPOD Rundown Database Integration Mapping
 * Maps prototype data model to existing VidPOD database schema
 */

class RundownDatabaseMapping {
    
    /**
     * Maps prototype rundown data to VidPOD database schema
     * 
     * PROTOTYPE MODEL -> VIDPOD DATABASE SCHEMA
     * ========================================
     * 
     * Prototype Rundown Interface:
     * {
     *   id: string,              -> rundowns.id
     *   createdAt: string,       -> rundowns.created_at
     *   airDate: string,         -> rundowns.scheduled_date
     *   showName: string,        -> rundowns.title
     *   share: boolean,          -> rundowns.status ('shared' flag via status)
     *   target: string,          -> stored in rundown_segments.content as JSONB {target: "20:00"}
     *   hosts: string[],         -> rundown_talent table (role: 'host')
     *   guests: string[],        -> rundown_talent table (role: 'guest')
     *   cards: Segment[]         -> rundown_segments table
     * }
     * 
     * Prototype Segment Interface:
     * {
     *   id: string,              -> rundown_segments.id
     *   title: string,           -> rundown_segments.title
     *   time: string,            -> rundown_segments.duration (converted to seconds)
     *   status: SegmentStatus,   -> rundown_segments.content.status (JSONB)
     *   pinned: boolean,         -> rundown_segments.is_pinned
     *   open: boolean,           -> rundown_segments.content.open (JSONB UI state)
     *   intro: string,           -> rundown_segments.content.intro (JSONB)
     *   questions: string[],     -> rundown_segments.content.questions (JSONB)
     *   close: string,           -> rundown_segments.content.close (JSONB)
     *   notesText: string        -> rundown_segments.content.notes (JSONB)
     * }
     */
    
    static mapPrototypeToDatabase(prototypeData) {
        return {
            // Main rundown record
            rundown: {
                title: prototypeData.showName,
                scheduled_date: prototypeData.airDate + 'T00:00:00.000Z',
                status: prototypeData.share ? 'shared' : 'draft',
                // created_by, class_id will be set by API
            },
            
            // Talent records
            talent: [
                ...(prototypeData.hosts || []).map((name, index) => ({
                    name: name,
                    role: 'host',
                    bio: null,
                    contact_info: {},
                    notes: null
                })),
                ...(prototypeData.guests || []).map((name, index) => ({
                    name: name,
                    role: 'guest', 
                    bio: null,
                    contact_info: {},
                    notes: null
                }))
            ],
            
            // Segment records with JSONB content
            segments: (prototypeData.cards || []).map((card, index) => ({
                title: card.title,
                type: this.mapSegmentType(card.id),
                duration: this.parseTimeStringToSeconds(card.time),
                order_index: index,
                is_pinned: card.pinned,
                notes: card.notesText,
                content: {
                    status: card.status,
                    open: card.open,
                    intro: card.intro,
                    questions: card.questions || [''],
                    close: card.close,
                    notes: card.notesText,
                    // Store target time in first segment for easy access
                    ...(index === 0 ? { target: prototypeData.target } : {})
                }
            }))
        };
    }
    
    static mapDatabaseToPrototype(databaseData) {
        const rundown = databaseData;
        const segments = rundown.segments || [];
        const talent = rundown.talent || [];
        
        // Extract target time from first segment or default
        const targetTime = segments[0]?.content?.target || '20:00';
        
        return {
            id: `r_${rundown.id}`,
            createdAt: rundown.created_at,
            airDate: rundown.scheduled_date ? rundown.scheduled_date.split('T')[0] : new Date().toISOString().split('T')[0],
            showName: rundown.title,
            share: rundown.status === 'shared',
            target: targetTime,
            hosts: talent.filter(t => t.role === 'host' || t.role === 'co-host').map(t => t.name),
            guests: talent.filter(t => t.role === 'guest' || t.role === 'expert').map(t => t.name),
            cards: segments.map(segment => ({
                id: segment.id.toString(),
                title: segment.title,
                time: this.formatSecondsToTimeString(segment.duration),
                status: segment.content?.status || 'Draft',
                pinned: segment.is_pinned,
                open: segment.content?.open || false,
                intro: segment.content?.intro || '',
                questions: segment.content?.questions || [''],
                close: segment.content?.close || '',
                notesText: segment.content?.notes || ''
            }))
        };
    }
    
    static mapSegmentType(prototypeId) {
        const typeMap = {
            'intro': 'intro',
            'outro': 'outro'
        };
        
        if (typeMap[prototypeId]) {
            return typeMap[prototypeId];
        }
        
        // Default to story type for regular segments
        return 'story';
    }
    
    static parseTimeStringToSeconds(timeStr) {
        if (!timeStr || typeof timeStr !== 'string') return 0;
        
        const parts = timeStr.split(':');
        if (parts.length !== 2) return 0;
        
        const minutes = parseInt(parts[0]) || 0;
        const seconds = parseInt(parts[1]) || 0;
        
        return (minutes * 60) + seconds;
    }
    
    static formatSecondsToTimeString(totalSeconds) {
        if (!totalSeconds || totalSeconds < 0) return '00:00';
        
        const minutes = Math.floor(totalSeconds / 60);
        const seconds = totalSeconds % 60;
        
        return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    }
    
    /**
     * API Integration Patterns
     * 
     * CRUD Operations Mapping:
     * ========================
     * 
     * CREATE RUNDOWN:
     * - POST /api/rundowns (creates main record + default intro/outro)
     * - POST /api/rundown-talent (bulk create talent)
     * - POST /api/rundown-segments (bulk create segments)
     * 
     * READ RUNDOWN:
     * - GET /api/rundowns/:id (returns full rundown with segments, talent, stories)
     * 
     * UPDATE RUNDOWN:
     * - PUT /api/rundowns/:id (update main rundown fields)
     * - PUT /api/rundown-segments/:id (update individual segments)
     * - PUT /api/rundown-talent/:id (update individual talent)
     * - POST /api/rundown-segments (create new segments)
     * - DELETE /api/rundown-segments/:id (remove segments)
     * 
     * DRAG & DROP REORDER:
     * - PUT /api/rundown-segments/reorder (bulk update order_index values)
     * 
     * AUTO-SAVE STRATEGY:
     * - Debounced saves every 300ms for input changes
     * - Immediate saves for structural changes (add/remove/reorder)
     * - Optimistic UI updates with rollback on error
     */
    
    static getAPIEndpoints() {
        return {
            rundowns: '/api/rundowns',
            segments: '/api/rundown-segments',
            talent: '/api/rundown-talent',
            stories: '/api/rundown-stories',
            reorderSegments: '/api/rundown-segments/reorder'
        };
    }
    
    /**
     * JSONB Content Field Structure
     * ==============================
     * 
     * rundown_segments.content JSONB field will store:
     * {
     *   "status": "Draft|Needs Review|Ready",
     *   "open": boolean,                    // UI expansion state
     *   "intro": string,                    // Segment intro text
     *   "questions": string[],              // Interview questions
     *   "close": string,                    // Topic close text
     *   "notes": string,                    // Production notes
     *   "target": string,                   // Target time (stored in first segment)
     *   "customData": object                // Extension point for future features
     * }
     * 
     * This flexible approach allows:
     * - Easy addition of new segment features
     * - UI state persistence
     * - Backward compatibility
     * - Efficient queries using PostgreSQL JSONB operators
     */
    
    static getDefaultSegmentContent() {
        return {
            status: 'Draft',
            open: false,
            intro: '',
            questions: [''],
            close: '',
            notes: ''
        };
    }
    
    static getDefaultRundownData() {
        return {
            target: '20:00',
            hosts: [],
            guests: [],
            cards: [
                {
                    id: 'intro',
                    title: 'Show Intro',
                    time: '01:00',
                    status: 'Ready',
                    pinned: true,
                    open: false,
                    intro: '',
                    questions: [''],
                    close: '',
                    notesText: ''
                },
                {
                    id: 'outro',
                    title: 'Show Outro', 
                    time: '00:45',
                    status: 'Ready',
                    pinned: true,
                    open: false,
                    intro: '',
                    questions: [''],
                    close: '',
                    notesText: ''
                }
            ]
        };
    }
}

// Export for use in other modules
window.RundownDatabaseMapping = RundownDatabaseMapping;
