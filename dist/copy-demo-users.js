var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
var main = createClient(process.env.MAIN_URL, process.env.MAIN_SERVICE_KEY, { auth: { autoRefreshToken: false } });
var branch = createClient(process.env.BRANCH_URL, process.env.BRANCH_SERVICE_KEY, { auth: { autoRefreshToken: false } });
/** フィルタ条件：メールに demo / test を含む or role=company */
var shouldCopy = function (u) {
    var _a;
    return /demo|test/i.test(u.email) ||
        ((_a = u.user_metadata) === null || _a === void 0 ? void 0 : _a.role) === 'company';
};
(function () { return __awaiter(void 0, void 0, void 0, function () {
    var _a, users, error, targets, _i, targets_1, u, e_1;
    var _b;
    return __generator(this, function (_c) {
        switch (_c.label) {
            case 0: return [4 /*yield*/, main.auth.admin.listUsers({ perPage: 1000 })];
            case 1:
                _a = _c.sent(), users = _a.data.users, error = _a.error;
                if (error)
                    throw error;
                targets = users.filter(shouldCopy);
                console.log("\u5019\u88DC ".concat(targets.length, " \u4EBA\u4E2D ").concat(targets.length, " \u4EBA\u3092\u30B3\u30D4\u30FC\u3057\u307E\u3059"));
                _i = 0, targets_1 = targets;
                _c.label = 2;
            case 2:
                if (!(_i < targets_1.length)) return [3 /*break*/, 7];
                u = targets_1[_i];
                _c.label = 3;
            case 3:
                _c.trys.push([3, 5, , 6]);
                return [4 /*yield*/, branch.auth.admin.createUser({
                        email: u.email,
                        // 既存ハッシュは渡せないため一時パスワードを設定
                        password: "Temp".concat(Math.random().toString(36).slice(2, 8), "!"),
                        email_confirm: true,
                        user_metadata: u.user_metadata,
                        app_metadata: u.app_metadata,
                    })];
            case 4:
                _c.sent();
                console.log("\u2714  Copied ".concat(u.email));
                return [3 /*break*/, 6];
            case 5:
                e_1 = _c.sent();
                if ((_b = e_1.message) === null || _b === void 0 ? void 0 : _b.includes('already registered')) {
                    console.log("\u23AF\u23AF Skip (already) ".concat(u.email));
                }
                else {
                    console.error("\u2716  Failed ".concat(u.email, ":"), e_1);
                }
                return [3 /*break*/, 6];
            case 6:
                _i++;
                return [3 /*break*/, 2];
            case 7:
                console.log('✨  Done');
                return [2 /*return*/];
        }
    });
}); })();
