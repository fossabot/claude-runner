import React from "react";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "success" | "error";
  size?: "sm" | "md";
  loading?: boolean;
  children: React.ReactNode;
}

const Button: React.FC<ButtonProps> = ({
  variant = "primary",
  size = "md",
  loading = false,
  disabled,
  children,
  className = "",
  ...props
}) => {
  const classes = `${variant} ${size} ${className}`;

  return (
    <button className={classes} disabled={disabled ?? loading} {...props}>
      {loading && (
        <span
          className="loading-spinner"
          style={{ width: "12px", height: "12px", marginRight: "6px" }}
        />
      )}
      {children}
    </button>
  );
};

export default Button;
