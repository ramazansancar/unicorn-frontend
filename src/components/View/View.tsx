import React from 'react';

interface IProps {
    className?: string;
}

export const View: React.FC<React.PropsWithChildren<IProps>> = ({ children, className }) => {
    return <main className={`${className ?? ''}`}>{children}</main>;
};
