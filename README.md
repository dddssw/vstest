## 功能

统一管理 hooks

## 演示

文件内容示例

```js
//注释
export function a(){
   //foo的注释
   const foo
   return {foo}
}
```

![alt text](imgs/effect.png)

### hover 显示注释，注释需要写在导出内容的上面，// /\*都可，多行也会自动合并

![alt text](imgs/hover.png)

### 点击 hook 函数生成

![alt text](imgs/generate.png)

### 过滤选中

![alt text](imgs/filter.png)
![alt text](imgs/filterRes.png)

### 注意

没显示出来可能是语法错误，如果文件变化使用刷新按钮（悬浮）

暂不支持函数表达式的写法,建议与export写在一起

```js
//暂不支持
const a = () => {};
export default a;
```
