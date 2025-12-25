const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');

// Helper wrapper to hash password if created via this route? 
// For now, standard routes.
router.get('/', userController.getAllUsers);
router.get('/:id', userController.getUserById);
// router.post('/', userController.createUser); // Conflict with Auth Register? Maybe admin only.
router.put('/:id', userController.updateUser);
router.delete('/:id', userController.deleteUser);

module.exports = router;
