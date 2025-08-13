import mongoose from 'mongoose';

const { Schema, model } = mongoose;

const workoutSchema = new Schema({
  coords: {
    type: {
      latitude: {type: Number, required: true, max: 90, min: -90},
      longitude: {type: Number, required: true, max: 180, min: -180},
    },
    required: true
  },
  workout_type: {
    type: String,
    required: true,
    enum: ['running', 'cycling'],
    maxlength: 50,
    index: true
  },
  distance: {
    type: Number,
    required: true
  },
  duration: {
    type: Number,
    required: true
  },
  cadence: {
    type: Number,
    required: function () {
      return this.workout_type === 'running';
    }
  },
  elevation_gain: {
    type: Number,
    required: function () {
      return this.workout_type === 'cycling';
    }
  },
  custom_metrics: {
    type: Schema.Types.Mixed,
    default: {}
  },
  created_at: {
    type: Date,
    default: Date.now
  }
});

const Workout = model('Workout', workoutSchema);

export default Workout;
