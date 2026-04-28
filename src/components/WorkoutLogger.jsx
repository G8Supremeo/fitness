import { useReducer, useState } from 'react'

const CATEGORIES = [
  { id: 'cardio', label: 'Cardio', icon: '🏃' },
  { id: 'weights', label: 'Weights', icon: '🏋️' },
  { id: 'bodyweight', label: 'Bodyweight', icon: '🤸' },
  { id: 'yoga', label: 'Yoga & Mind', icon: '🧘' },
  { id: 'recovery', label: 'Recovery', icon: '💧' },
]

const MOODS = ['😞', '😐', '🙂', '😊', '🤩']

const today = () => new Date().toISOString().slice(0, 10)

const defaults = {
  cardio: { type: 'Run', category: 'cardio', duration: 30, calories: 250, distance: 5, pace: '6:00', heart_rate: 0, notes: '', date: today() },
  weights: { type: 'Strength', category: 'weights', duration: 45, calories: 300, sets: 3, reps: 12, weight_kg: 20, notes: '', date: today() },
  bodyweight: { type: 'Push-ups', category: 'bodyweight', duration: 20, calories: 150, sets: 4, reps: 20, notes: '', date: today() },
  yoga: { type: 'Yoga', category: 'yoga', duration: 30, calories: 100, mood: 3, notes: '', date: today() },
  recovery: { type: 'Hydration', category: 'recovery', duration: 0, calories: 0, water_ml: 2000, sleep_hours: 7.5, notes: '', date: today() },
}

function reducer(state, action) {
  switch (action.type) {
    case 'SET':
      return { ...state, [action.field]: action.value }
    case 'RESET':
      return { ...defaults[action.category] }
    default:
      return state
  }
}

export default function WorkoutLogger({ onLog, addToast }) {
  const [activeTab, setActiveTab] = useState('cardio')
  const [form, dispatch] = useReducer(reducer, defaults.cardio)
  const [submitting, setSubmitting] = useState(false)

  const switchTab = (cat) => {
    setActiveTab(cat)
    dispatch({ type: 'RESET', category: cat })
  }

  const set = (field) => (e) => dispatch({ type: 'SET', field, value: e.target.value })
  const setNum = (field) => (e) => dispatch({ type: 'SET', field, value: Number(e.target.value) || 0 })

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSubmitting(true)
    try {
      await onLog(form)
      addToast('Workout logged successfully!', 'success', '🎉 Logged!')
      dispatch({ type: 'RESET', category: activeTab })
    } catch (err) {
      addToast(err.message, 'error')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div>
      {/* Category Tabs */}
      <div className="workout-tabs">
        {CATEGORIES.map((cat) => (
          <button
            key={cat.id}
            className={`workout-tab${activeTab === cat.id ? ' active' : ''}`}
            onClick={() => switchTab(cat.id)}
            type="button"
          >
            <span className="tab-icon">{cat.icon}</span>
            <span>{cat.label}</span>
          </button>
        ))}
      </div>

      {/* Dynamic Form */}
      <form onSubmit={handleSubmit} className="form-grid">
        {/* Common: Type & Date */}
        <div className="form-row">
          <div className="form-group">
            <label htmlFor="log-type">Exercise Type</label>
            {activeTab === 'cardio' ? (
              <select id="log-type" value={form.type} onChange={set('type')}>
                <option>Run</option>
                <option>Cycling</option>
                <option>Swimming</option>
                <option>Sprint</option>
                <option>Walk</option>
                <option>Sports</option>
              </select>
            ) : activeTab === 'weights' ? (
              <select id="log-type" value={form.type} onChange={set('type')}>
                <option>Strength</option>
                <option>Bench Press</option>
                <option>Squat</option>
                <option>Deadlift</option>
                <option>Rows</option>
                <option>Shoulder Press</option>
                <option>Bicep Curls</option>
              </select>
            ) : activeTab === 'bodyweight' ? (
              <select id="log-type" value={form.type} onChange={set('type')}>
                <option>Push-ups</option>
                <option>Pull-ups</option>
                <option>Dips</option>
                <option>Core / Abs</option>
                <option>Calisthenics</option>
                <option>Muscles-ups</option>
              </select>
            ) : activeTab === 'yoga' ? (
              <select id="log-type" value={form.type} onChange={set('type')}>
                <option>Yoga</option>
                <option>Meditation</option>
                <option>Breathwork</option>
                <option>Stretching</option>
                <option>Pilates</option>
              </select>
            ) : (
              <select id="log-type" value={form.type} onChange={set('type')}>
                <option>Hydration</option>
                <option>Sleep Log</option>
                <option>Active Recovery</option>
                <option>Rest Day</option>
              </select>
            )}
          </div>
          <div className="form-group">
            <label htmlFor="log-date">Date</label>
            <input id="log-date" type="date" value={form.date} onChange={set('date')} required />
          </div>
        </div>

        {/* Cardio-specific */}
        {activeTab === 'cardio' && (
          <>
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="log-distance">Distance (km)</label>
                <input id="log-distance" type="number" step="0.1" min="0" value={form.distance} onChange={setNum('distance')} />
              </div>
              <div className="form-group">
                <label htmlFor="log-pace">Pace / Speed</label>
                <input id="log-pace" type="text" placeholder="e.g. 5:30 or 25km/h" value={form.pace} onChange={set('pace')} />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="log-duration">Duration (min)</label>
                <input id="log-duration" type="number" min="0" value={form.duration} onChange={setNum('duration')} />
              </div>
              <div className="form-group">
                <label htmlFor="log-calories">Calories Burned</label>
                <input id="log-calories" type="number" min="0" value={form.calories} onChange={setNum('calories')} />
              </div>
            </div>
            <div className="form-group">
              <label htmlFor="log-hr">Heart Rate (BPM)</label>
              <input id="log-hr" type="number" min="0" max="250" value={form.heart_rate} onChange={setNum('heart_rate')} placeholder="Optional" />
            </div>
          </>
        )}

        {/* Weights-specific */}
        {activeTab === 'weights' && (
          <>
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="log-sets">Sets</label>
                <input id="log-sets" type="number" min="1" value={form.sets} onChange={setNum('sets')} />
              </div>
              <div className="form-group">
                <label htmlFor="log-reps">Reps</label>
                <input id="log-reps" type="number" min="1" value={form.reps} onChange={setNum('reps')} />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="log-weight">Weight (kg)</label>
                <input id="log-weight" type="number" step="0.5" min="0" value={form.weight_kg} onChange={setNum('weight_kg')} />
              </div>
              <div className="form-group">
                <label htmlFor="log-duration-gym">Duration (min)</label>
                <input id="log-duration-gym" type="number" min="0" value={form.duration} onChange={setNum('duration')} />
              </div>
            </div>
            <div className="form-group">
              <label htmlFor="log-calories-gym">Calories Burned</label>
              <input id="log-calories-gym" type="number" min="0" value={form.calories} onChange={setNum('calories')} />
            </div>
          </>
        )}

        {/* Bodyweight-specific */}
        {activeTab === 'bodyweight' && (
          <>
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="log-sets-bw">Sets</label>
                <input id="log-sets-bw" type="number" min="1" value={form.sets} onChange={setNum('sets')} />
              </div>
              <div className="form-group">
                <label htmlFor="log-reps-bw">Reps</label>
                <input id="log-reps-bw" type="number" min="1" value={form.reps} onChange={setNum('reps')} />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="log-duration-bw">Duration (min)</label>
                <input id="log-duration-bw" type="number" min="0" value={form.duration} onChange={setNum('duration')} />
              </div>
              <div className="form-group">
                <label htmlFor="log-calories-bw">Calories Burned</label>
                <input id="log-calories-bw" type="number" min="0" value={form.calories} onChange={setNum('calories')} />
              </div>
            </div>
          </>
        )}

        {/* Yoga/Mind-specific */}
        {activeTab === 'yoga' && (
          <>
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="log-duration-yoga">Duration (min)</label>
                <input id="log-duration-yoga" type="number" min="0" value={form.duration} onChange={setNum('duration')} />
              </div>
              <div className="form-group">
                <label htmlFor="log-calories-yoga">Calories Burned</label>
                <input id="log-calories-yoga" type="number" min="0" value={form.calories} onChange={setNum('calories')} />
              </div>
            </div>
            <div className="form-group">
              <label>Mood</label>
              <div className="mood-selector">
                {MOODS.map((emoji, idx) => (
                  <button
                    key={idx}
                    type="button"
                    className={`mood-btn${form.mood === idx + 1 ? ' active' : ''}`}
                    onClick={() => dispatch({ type: 'SET', field: 'mood', value: idx + 1 })}
                    title={`Mood ${idx + 1}`}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>
          </>
        )}

        {/* Recovery-specific */}
        {activeTab === 'recovery' && (
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="log-water">Water Intake (ml)</label>
              <input id="log-water" type="number" min="0" step="100" value={form.water_ml} onChange={setNum('water_ml')} />
            </div>
            <div className="form-group">
              <label htmlFor="log-sleep">Sleep (hours)</label>
              <input id="log-sleep" type="number" min="0" max="24" step="0.5" value={form.sleep_hours} onChange={setNum('sleep_hours')} />
            </div>
          </div>
        )}

        {/* Common: Notes */}
        <div className="form-group">
          <label htmlFor="log-notes">Notes</label>
          <textarea
            id="log-notes"
            value={form.notes}
            onChange={set('notes')}
            placeholder="How did it feel? Any observations…"
            rows={2}
          />
        </div>

        <button type="submit" className="btn btn-primary btn-full" disabled={submitting}>
          {submitting ? 'Saving…' : '💪 Log Workout'}
        </button>
      </form>
    </div>
  )
}
