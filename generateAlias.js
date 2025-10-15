/**
 * 生成 aliases（值 -> 表达式）：
 * - seed 视为十进制字符串，比如 "352"
 * - 叶子可以是任意连续子串（"3"、"35"、"52"、"352"），且可一元取负
 * - 组合：+ - * /（仅整除才保留除法），并枚举任意括号（二叉划分）
 * - 每个“值”保留多条最短表达式（按长度排序，默认最多 3 条）
 * - 若遍历后没有 1，则补上 "1": "seed/seed"
 */
function generateAliasesFromSeedConcat(seed, opts = {}) {
    const {
      allowUnaryMinus = true,       // 叶子可一元负号
      keepTopKByLen = 3,            // 每个值保留长度最短的前 K 条表达式（>=1 才能同时保留 "37" 和 "35+2"）
      maxResultsPerNode = 20000,    // 每个区间最多保留这么多“不同的值”，避免爆炸
    } = opts;
  
    const s = String(seed);
    if (!/^\d+$/.test(s) || s === "0") {
      throw new Error("seed 必须是十进制正整数（字符串或 number）。");
    }
    const n = s.length;
  
    // 工具：在 Map<value, string[]> 中插入表达式，按长度保留前 K 条最短式子
    const pushExpr = (map, val, expr) => {
      let arr = map.get(val);
      if (!arr) {
        map.set(val, [expr]);
        return;
      }
      if (arr.includes(expr)) return;
      arr.push(expr);
      arr.sort((a, b) => a.length - b.length);
      if (arr.length > keepTopKByLen) arr.length = keepTopKByLen;
    };
  
    // 记忆化：solve(l, r) 返回 Map<number, string[]>
    const memo = new Map();
    const keyOf = (l, r) => l + "," + r;

    // 避免给正整数叶子加括号；复合表达式与负数保持括号
    const wrapIfNeeded = (expr) => {
      if (/^-?\d+$/.test(expr)) {
        return expr.startsWith("-") ? `(${expr})` : expr;
      }
      return `(${expr})`;
    };
  
    function solve(l, r) {
      const key = keyOf(l, r);
      if (memo.has(key)) return memo.get(key);
  
      let res = new Map();
  
      // 1) 叶子：把 s[l..r] 当作一个整数
      const leafStr = s.slice(l, r + 1);             // 允许前导 0，例如 "05" -> 5
      const leafVal = parseInt(leafStr, 10);
      // 正数叶
      pushExpr(res, leafVal, leafStr);
      // 一元负号（0 取负还是 0，没必要）
      if (allowUnaryMinus && leafVal !== 0) {
        pushExpr(res, -leafVal, "-" + leafStr);
      }
  
      // 2) 组合：枚举所有切分点（括号结构）
      if (l < r) {
        for (let k = l; k < r; k++) {
          const L = solve(l, k);
          const R = solve(k + 1, r);
  
          for (const [v1, e1s] of L) {
            for (const [v2, e2s] of R) {
              for (const e1 of e1s) {
                for (const e2 of e2s) {
                  const a = wrapIfNeeded(e1);
                  const b = wrapIfNeeded(e2);
  
                  // +
                  pushExpr(res, v1 + v2, `${a}+${b}`);
                  // -
                  pushExpr(res, v1 - v2, `${a}-${b}`);
                  // *
                  pushExpr(res, v1 * v2, `${a}*${b}`);
                  // / 仅整除
                  if (v2 !== 0 && Number.isInteger(v1 / v2)) {
                    pushExpr(res, v1 / v2, `${a}/${b}`);
                  }
                }
              }
            }
          }
        }
      }
  
      // 3) 限制每个区间的不同值总量，按代表式子长度排序裁剪
      if (res.size > maxResultsPerNode) {
        const entries = [...res.entries()];
        entries.sort(([, A], [, B]) => A[0].length - B[0].length);
        res = new Map(entries.slice(0, maxResultsPerNode));
      }
  
      memo.set(key, res);
      return res;
    }
  
    const full = solve(0, n - 1);
  
    // 输出 aliases：把最外层多余括号去掉，美观一些
    const aliases = {};
    for (const [val, exprs] of full) {
      if (val < 0) continue;
      for (const expr0 of exprs) {
        let expr = expr0;
        if (/^\([^\(\)]+\)$/.test(expr)) expr = expr.slice(1, -1);
        // 为了“一个值可有多条式子”，这里用数组存；若你只想要一条，可改成只取 exprs[0]
        if (!aliases[val]) aliases[val] = [];
        if (!aliases[val].includes(expr)) aliases[val].push(expr);
      }
    }
  
    // 若没有 1，就补 seed/seed
    if (!aliases["1"]) {
      aliases["1"] = [`${s}/${s}`];
    }
    //0 、-1
    
  
    return aliases;
  }
  
  /* ================= 使用示例 ================= */
  
  // 例 1：352
  const a352 = generateAliasesFromSeedConcat(7846, { keepTopKByLen: 1 });
  console.log(a352)
//   console.log("0:", a352["0"]);  // 可能包含 "3-5+2"
//   console.log("6:", a352["6"]);  // 可能包含 "3+5-2"
//   console.log("4:", a352["4"]);  // 可能包含 "-3+5+2"
//   console.log("7:", a352["7"]);  // 可能包含 "-3+5*2"
//   console.log("1:", a352["1"]);  // 若没生成 "(-3+5)/2"，则为 "352/352"
  
//   // 例 2：希望看到“拼接成多位”的用法：
//   // 37 既可以是 "37"，也应包含 "35+2"；
//   // 55 既可以是 "55"，也应包含 "3+52"（如果 seed=352）。
//   console.log("37:", a352["37"]); // 例如 ["37","(35)+(2)"]（顺序依长度而定）
//   console.log("55:", a352["55"]); // 例如 ["(3)+(52)"]（如果生成得到）
  