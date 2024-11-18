mongosh "mongodb://localhost:27017/audio-perception"

db.users.find()
db.getUsers()
db.changeUserPassword("username", "newPassword")
db.grantRolesToUser("username", [
    { role: "readWrite", db: "anotherDatabase" }
])

# Find specific user by userId
db.users.findOne({ userId: "specific_user_id" })

# Find users in specific phase
db.users.find({ currentPhase: "training" })

# Find admin users
db.users.find({ isAdmin: true })

# create user (non admin)
db.users.insertOne({
    userId: "user123",
    password: "hashedPassword", // Note: Passwords should be hashed in your app
    email: "user@example.com",
    currentPhase: "pretest",
    trainingDay: 1,
    lastTrainingDate: new Date(),
    completed: false,
    isActive: true,
    isAdmin: false
})

# add admin user
db.users.insertOne({
    userId: "user123",
    password: "hashedPassword", 
    email: "user@example.com",
    currentPhase: "pretest",
    trainingDay: 1,
    lastTrainingDate: new Date(),
    completed: false,
    isActive: true,
    isAdmin: true
})

# Find active users in training phase
db.users.find({
    isActive: true,
    currentPhase: "training"
})

# Update user's admin status
db.users.updateOne({ userId: "adminHIL" }, { $set: { isAdmin: true } });

