const fs = require('fs');
const { USERS_FILE, SLAUGHTERHOUSES_FILE } = require('../../config/paths');

class UsersRepository {
    static getAllUsers() {
        try {
            if (fs.existsSync(USERS_FILE)) {
                return JSON.parse(fs.readFileSync(USERS_FILE, 'utf-8'));
            }
        } catch (err) {
            console.error('Error reading users file:', err);
        }
        return [];
    }

    static findByUsername(username) {
        if (!username) return null;
        const users = this.getAllUsers();
        return users.find((u) => u.username && u.username.toLowerCase() === username.trim().toLowerCase()) || null;
    }

    static saveUsers(users) {
        fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2), 'utf-8');
    }

    static createUser(userData) {
        const users = this.getAllUsers();
        const username = (userData.username || '').trim();
        if (!username) throw new Error('نام کاربری الزامی است.');
        if (!userData.password) throw new Error('کلمه عبور الزامی است.');
        if (!userData.name) throw new Error('نام و نام خانوادگی مرغدار الزامی است.');

        const exists = users.some((u) => u.username && u.username.toLowerCase() === username.toLowerCase());
        if (exists) throw new Error(`کاربری با نام کاربری "${username}" از قبل وجود دارد.`);

        const newUser = {
            username: username,
            password: userData.password.trim(),
            name: userData.name.trim(),
            breed: (userData.breed || 'راس').trim(),
            epidemiologicCode: (userData.epidemiologicCode || '').trim(),
            hatchingPermitCode: (userData.hatchingPermitCode || '').trim(),
        };

        users.push(newUser);
        this.saveUsers(users);
        return newUser;
    }

    static updateUser(targetUsername, updateData) {
        const users = this.getAllUsers();
        const cleanTarget = (targetUsername || '').trim().toLowerCase();
        const index = users.findIndex((u) => u.username && u.username.toLowerCase() === cleanTarget);
        if (index === -1) throw new Error('کاربر مورد نظر یافت نشد.');

        const newUsername = (updateData.username || users[index].username).trim();
        // Check uniqueness if username changed
        if (newUsername.toLowerCase() !== cleanTarget) {
            const conflict = users.some((u, i) => i !== index && u.username && u.username.toLowerCase() === newUsername.toLowerCase());
            if (conflict) throw new Error(`نام کاربری "${newUsername}" توسط کاربر دیگری استفاده شده است.`);
        }

        const updated = {
            username: newUsername,
            password: updateData.password !== undefined ? updateData.password.trim() : users[index].password,
            name: updateData.name !== undefined ? updateData.name.trim() : users[index].name,
            breed: updateData.breed !== undefined ? updateData.breed.trim() : (users[index].breed || 'راس'),
            epidemiologicCode: updateData.epidemiologicCode !== undefined ? updateData.epidemiologicCode.trim() : (users[index].epidemiologicCode || ''),
            hatchingPermitCode: updateData.hatchingPermitCode !== undefined ? updateData.hatchingPermitCode.trim() : (users[index].hatchingPermitCode || ''),
        };

        users[index] = updated;
        this.saveUsers(users);
        return updated;
    }

    static deleteUser(username) {
        const users = this.getAllUsers();
        const cleanTarget = (username || '').trim().toLowerCase();
        const initialLength = users.length;
        const filtered = users.filter((u) => !u.username || u.username.toLowerCase() !== cleanTarget);
        if (filtered.length === initialLength) throw new Error('کاربر مورد نظر برای حذف یافت نشد.');
        this.saveUsers(filtered);
        return true;
    }

    // ==========================================
    // Slaughterhouse CRUD
    // ==========================================

    static getAllSlaughterhouses() {
        try {
            if (fs.existsSync(SLAUGHTERHOUSES_FILE)) {
                return JSON.parse(fs.readFileSync(SLAUGHTERHOUSES_FILE, 'utf-8'));
            }
        } catch (err) {
            console.error('Error reading slaughterhouses file:', err);
        }
        return [];
    }

    static saveSlaughterhouses(list) {
        fs.writeFileSync(SLAUGHTERHOUSES_FILE, JSON.stringify(list, null, 2), 'utf-8');
    }

    static createSlaughterhouse(data) {
        const list = this.getAllSlaughterhouses();
        const name = (data.name || '').trim();
        const code = (data.code || '').trim();
        if (!name) throw new Error('نام کشتارگاه الزامی است.');
        if (!code) throw new Error('کد یکتای جهاد کشاورزی الزامی است.');

        const exists = list.some((item) => item.code === code);
        if (exists) throw new Error(`کشتارگاهی با شناسه "${code}" از قبل ثبت شده است.`);

        const newSh = { name, code };
        list.push(newSh);
        this.saveSlaughterhouses(list);
        return newSh;
    }

    static updateSlaughterhouse(targetCode, updateData) {
        const list = this.getAllSlaughterhouses();
        const cleanTarget = (targetCode || '').trim();
        const index = list.findIndex((item) => item.code === cleanTarget);
        if (index === -1) throw new Error('کشتارگاه مورد نظر یافت نشد.');

        const newCode = (updateData.code || list[index].code).trim();
        if (newCode !== cleanTarget) {
            const conflict = list.some((item, i) => i !== index && item.code === newCode);
            if (conflict) throw new Error(`شناسه "${newCode}" برای کشتارگاه دیگری ثبت شده است.`);
        }

        const updated = {
            name: updateData.name !== undefined ? updateData.name.trim() : list[index].name,
            code: newCode,
        };

        list[index] = updated;
        this.saveSlaughterhouses(list);
        return updated;
    }

    static deleteSlaughterhouse(code) {
        const list = this.getAllSlaughterhouses();
        const cleanTarget = (code || '').trim();
        const initialLength = list.length;
        const filtered = list.filter((item) => item.code !== cleanTarget);
        if (filtered.length === initialLength) throw new Error('کشتارگاه مورد نظر برای حذف یافت نشد.');
        this.saveSlaughterhouses(filtered);
        return true;
    }
}

module.exports = UsersRepository;
