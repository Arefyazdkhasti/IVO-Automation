const UsersRepository = require('../../features/users/users.repository');

class UsersController {
    // ==========================================
    // Users Management Handlers
    // ==========================================

    static getUsers(req, res) {
        try {
            const users = UsersRepository.getAllUsers();
            res.json({ success: true, users });
        } catch (err) {
            res.status(500).json({ success: false, error: err.message });
        }
    }

    static createUser(req, res) {
        try {
            const newUser = UsersRepository.createUser(req.body);
            res.status(201).json({ success: true, message: 'کاربر با موفقیت اضافه شد.', user: newUser });
        } catch (err) {
            res.status(400).json({ success: false, error: err.message });
        }
    }

    static updateUser(req, res) {
        try {
            const { username } = req.params;
            const updatedUser = UsersRepository.updateUser(username, req.body);
            res.json({ success: true, message: 'اطلاعات کاربر با موفقیت به‌روزرسانی شد.', user: updatedUser });
        } catch (err) {
            res.status(400).json({ success: false, error: err.message });
        }
    }

    static deleteUser(req, res) {
        try {
            const { username } = req.params;
            UsersRepository.deleteUser(username);
            res.json({ success: true, message: `کاربر ${username} با موفقیت حذف شد.` });
        } catch (err) {
            res.status(400).json({ success: false, error: err.message });
        }
    }

    // ==========================================
    // Slaughterhouses Management Handlers
    // ==========================================

    static getSlaughterhouses(req, res) {
        try {
            const list = UsersRepository.getAllSlaughterhouses();
            res.json({ success: true, slaughterhouses: list });
        } catch (err) {
            res.status(500).json({ success: false, error: err.message });
        }
    }

    static createSlaughterhouse(req, res) {
        try {
            const newSh = UsersRepository.createSlaughterhouse(req.body);
            res.status(201).json({ success: true, message: 'کشتارگاه با موفقیت افزوده شد.', slaughterhouse: newSh });
        } catch (err) {
            res.status(400).json({ success: false, error: err.message });
        }
    }

    static updateSlaughterhouse(req, res) {
        try {
            const { code } = req.params;
            const updatedSh = UsersRepository.updateSlaughterhouse(code, req.body);
            res.json({ success: true, message: 'اطلاعات کشتارگاه با موفقیت ویرایش شد.', slaughterhouse: updatedSh });
        } catch (err) {
            res.status(400).json({ success: false, error: err.message });
        }
    }

    static deleteSlaughterhouse(req, res) {
        try {
            const { code } = req.params;
            UsersRepository.deleteSlaughterhouse(code);
            res.json({ success: true, message: `کشتارگاه با کد ${code} با موفقیت حذف شد.` });
        } catch (err) {
            res.status(400).json({ success: false, error: err.message });
        }
    }
}

module.exports = UsersController;
