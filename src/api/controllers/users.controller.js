const UsersRepository = require('../../features/users/users.repository');
const supabaseService = require('../../services/supabase.service');

class UsersController {
    // ==========================================
    // Database & Supabase Status
    // ==========================================

    static async getDatabaseStatus(req, res) {
        try {
            const status = await supabaseService.checkStatus();
            res.json({ success: true, ...status });
        } catch (err) {
            res.status(500).json({ success: false, error: err.message });
        }
    }

    static async syncToSupabase(req, res) {
        try {
            const localUsers = UsersRepository.getLocalUsers();
            const result = await supabaseService.syncUsersFromLocal(localUsers);
            res.json({ success: true, ...result });
        } catch (err) {
            res.status(400).json({ success: false, error: err.message });
        }
    }

    // ==========================================
    // Users Management Handlers
    // ==========================================

    static async getUsers(req, res) {
        try {
            const users = await UsersRepository.getAllUsers(req.user);
            res.json({ success: true, users });
        } catch (err) {
            res.status(500).json({ success: false, error: err.message });
        }
    }

    static async createUser(req, res) {
        try {
            const newUser = await UsersRepository.createUser(req.body, req.user);
            res.status(201).json({ success: true, message: 'کاربر با موفقیت اضافه شد.', user: newUser });
        } catch (err) {
            res.status(400).json({ success: false, error: err.message });
        }
    }

    static async updateUser(req, res) {
        try {
            const { username } = req.params;
            const updatedUser = await UsersRepository.updateUser(username, req.body, req.user);
            res.json({ success: true, message: 'اطلاعات کاربر با موفقیت به‌روزرسانی شد.', user: updatedUser });
        } catch (err) {
            res.status(400).json({ success: false, error: err.message });
        }
    }

    static async deleteUser(req, res) {
        try {
            const { username } = req.params;
            await UsersRepository.deleteUser(username, req.user);
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
