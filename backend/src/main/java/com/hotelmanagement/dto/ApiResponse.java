package com.hotelmanagement.dto;
import java.time.*;


public record ApiResponse<T>(boolean success,String message,T data,LocalDateTime timestamp) {
    public static <T> ApiResponse<T> ok(String message,T data) {
        return new ApiResponse<>(true,message,data,LocalDateTime.now());
    }
    public static <T> ApiResponse<T> fail(String message,T data) {
        return new ApiResponse<>(false,message,data,LocalDateTime.now());
    }
}
