package com.explorer.backend.dto;

public class NodeDTO {
    private String id;
    private String label;
    private String summary;
    private double x;
    private double y;

    public NodeDTO() {}

    public NodeDTO(String id, String label, String summary, double x, double y) {
        this.id = id;
        this.label = label;
        this.summary = summary;
        this.x = x;
        this.y = y;
    }

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getLabel() { return label; }
    public void setLabel(String label) { this.label = label; }

    public String getSummary() { return summary; }
    public void setSummary(String summary) { this.summary = summary; }

    public double getX() { return x; }
    public void setX(double x) { this.x = x; }

    public double getY() { return y; }
    public void setY(double y) { this.y = y; }
}
