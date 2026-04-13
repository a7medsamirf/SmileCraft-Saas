// تعريف عام لملفات الـ CSS عشان TypeScript يتوقف عن الاعتراض
declare module "*.css" {
  const content: { [className: string]: string };
  export default content;
}