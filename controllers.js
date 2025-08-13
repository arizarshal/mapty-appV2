import Workout from './models/workoutModels.js'; 

// GET all workouts
export async function getAllWorkouts(req, res) {
  try {
    const workouts = await Workout.find();
    res.status(200).json(workouts);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch workouts." });
  }
}

// GET single workout by ID
export async function getSingleWorkout(req, res) {
  try {
    const id = req.params.id;
    const workout = await Workout.findById(id);

    if (!workout) {
      return res.status(404).json({ error: "Workout not found." });
    }

    res.status(200).json(workout);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch the workout." });
  }
}

// POST create new workout
export async function createNewWorkout(req, res) {
  try {
    const {  workout_type, distance, duration, cadence, elevation_gain, custom_metrics, coords } = req.body;

    const workout = await Workout.create({
      workout_type,
      distance,
      duration,
      cadence,
      elevation_gain,
      custom_metrics,
      coords
    });
    console.log(req)

    res.status(201).json(workout);
    console.log(workout);
    console.log(res)
  } catch (err) {
    res.status(400).json({ error: err.message || "Failed to create workout." });
  }
}

// PUT update workout by ID
export async function updateWorkoutById(req, res) {
  try {
    const id = req.params.id;
    const updates = req.body;

    const updatedWorkout = await Workout.findByIdAndUpdate(id, updates, {
      new: true,
      runValidators: true
    });

    if (!updatedWorkout) {
      return res.status(404).json({ error: "Workout not found." });
    }

    res.status(200).json(updatedWorkout);
  } catch (error) {
    res.status(400).json({ error: error.message || "Workout not updated." });
  }
}

// DELETE workout by ID
export async function deleteWorkoutById(req, res) {
  try {
    const id = req.params.id;

    const deletedWorkout = await Workout.findByIdAndDelete(id);

    if (!deletedWorkout) {
      return res.status(404).json({ error: "Workout not found." });
    }

    res.status(200).json({ message: "Workout deleted successfully." });
  } catch (error) {
    res.status(500).json({ error: error.message || "Workout not deleted." });
  }
}
