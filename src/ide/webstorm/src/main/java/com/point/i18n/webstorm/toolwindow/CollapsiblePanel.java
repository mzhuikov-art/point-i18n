package com.point.i18n.webstorm.toolwindow;

import javax.swing.*;
import java.awt.*;
import java.awt.event.ActionEvent;
import java.awt.event.ActionListener;

/**
 * Collapsible panel with a toggle button to show/hide content.
 */
public class CollapsiblePanel extends JPanel {
    private final JPanel contentPanel;
    private final JButton toggleButton;
    private boolean expanded = true;
    
    public CollapsiblePanel(String title) {
        setLayout(new BorderLayout());
        setBorder(BorderFactory.createEmptyBorder(5, 5, 5, 5));
        
        // Toggle button with title
        toggleButton = new JButton((expanded ? "▼ " : "▶ ") + title);
        toggleButton.setHorizontalAlignment(SwingConstants.LEFT);
        toggleButton.setBorderPainted(false);
        toggleButton.setContentAreaFilled(false);
        toggleButton.setFocusPainted(false);
        toggleButton.addActionListener(e -> toggle());
        
        add(toggleButton, BorderLayout.NORTH);
        
        // Content panel
        contentPanel = new JPanel();
        contentPanel.setLayout(new BoxLayout(contentPanel, BoxLayout.Y_AXIS));
        contentPanel.setBorder(BorderFactory.createEmptyBorder(5, 15, 0, 0));
        add(contentPanel, BorderLayout.CENTER);
    }
    
    public void toggle() {
        expanded = !expanded;
        contentPanel.setVisible(expanded);
        toggleButton.setText((expanded ? "▼ " : "▶ ") + toggleButton.getText().substring(2));
        revalidate();
        repaint();
    }
    
    public void addComponent(Component component) {
        contentPanel.add(component);
        contentPanel.add(Box.createVerticalStrut(5));
    }
    
    public void setExpanded(boolean expanded) {
        if (this.expanded != expanded) {
            toggle();
        }
    }
    
    public boolean isExpanded() {
        return expanded;
    }
}

