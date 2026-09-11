export function Badge({ children, variant = 'purple' }) {
  const variants = {
    purple: 'tag',
    cyan: 'tag tag-cyan',
    gold: 'tag tag-gold',
    green: 'tag tag-green',
    red: 'tag tag-red',
  };
  return <span className={variants[variant] || 'tag'}>{children}</span>;
}
